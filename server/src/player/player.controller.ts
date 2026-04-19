import { Body, Controller, Get, Logger, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RoomMember } from '../entities/room-member.entity.js';
import { RoomQueue } from '../entities/room-queue.entity.js';
import { Track } from '../entities/track.entity.js';
import { AppException } from '../exceptions/app.exception.js';
import { ControllerGuard } from '../guards/controller.guard.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { MemberService } from '../rooms/member.service.js';
import { AutoDjService } from '../services/auto-dj.service.js';
import { RoomsGateway } from '../rooms/rooms.gateway.js';
import { LyricsService } from '../services/lyrics.service.js';
import { TranslationService } from '../services/translation.service.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { ErrorCode } from '../types/error-code.enum.js';
import { LyricsStatus, Permission, WsEvent } from '../types/index.js';
import { LyricsResponse } from './dto/lyrics-response.dto.js';
import { PlaybackStatus } from './dto/playback-status.dto.js';
import { VoteSkipResponse } from './dto/vote-skip-response.dto.js';
import { PlayerService } from './player.service.js';

@ApiTags('Player')
@Controller('player')
export class PlayerController {
  private readonly logger = new Logger(PlayerController.name);
  constructor(
    private readonly playerService: PlayerService,
    private readonly gateway: RoomsGateway,
    private readonly lyricsService: LyricsService,
    private readonly memberService: MemberService,
    private readonly autoDjService: AutoDjService,
    private readonly translationService: TranslationService,
    @InjectRepository(RoomMember) private readonly memberRepo: Repository<RoomMember>,
    @InjectRepository(RoomQueue) private readonly queueRepo: Repository<RoomQueue>,
  ) {
    this.playerService.onTrackChange(async (roomId) => {
      const status = await this.playerService.getStatus(roomId);
      this.gateway.broadcastSystem(roomId, WsEvent.PlaybackUpdated, '', status);
      const queue = await this.queueRepo.find({
        where: { room: { id: roomId }, played: false },
        order: { position: 'ASC' },
        relations: ['track'],
      });
      this.gateway.broadcastSystem(roomId, WsEvent.QueueUpdated, '', { queue });

      if (status?.track) {
        this.searchLyricsWhenReady(roomId, status.track, true);
      }
      for (const q of queue.slice(0, 3)) {
        this.searchLyricsWhenReady(roomId, q.track);
      }

      // AutoDJ: 곡 전환 시 트리거 + 실패 카운터 리셋
      this.autoDjService.resetFailCount(roomId);
      this.autoDjService.trigger(roomId);
    });

    this.playerService.onPlayFail((roomId, trackTitle) => {
      this.gateway.broadcastSystem(roomId, WsEvent.SystemMessage, `'${trackTitle}' 재생 불가 — 건너뜁니다`);
    });

    // AutoDJ 상태 → WS 브로드캐스트
    this.autoDjService.onStatusChange((roomId, status, reason) => {
      this.gateway.broadcastSystem(roomId, WsEvent.AutoDjStatus, '', { status, reason });
      if (status === 'disabled') this.gateway.broadcastSystem(roomId, WsEvent.RoomUpdated, '');
    });

    // AutoDJ 곡 추가 → 시스템 메시지
    this.autoDjService.onTrackAdded((roomId, track) => {
      this.gateway.broadcastSystem(roomId, WsEvent.TrackAdded, `🤖 AutoDJ가 "${track.name}"을(를) 추가했습니다`);
    });

    // AutoDJ 시스템 메시지 (실패 등)
    this.autoDjService.onSystemMessage((roomId, message) => {
      this.gateway.broadcastSystem(roomId, WsEvent.SystemMessage, message);
    });

    // 번역 완료 → WS 브로드캐스트
    this.translationService.onUpdated((trackId, roomIds) => {
      for (const roomId of roomIds) {
        this.gateway.broadcastSystem(roomId, WsEvent.LyricsUpdated, '', { trackId });
      }
    });

    // AutoDJ 배치 완료 → 큐 업데이트 + 자동 재생
    this.autoDjService.onBatchComplete((roomId, tracks) => {
      void (async () => {
        // 재생 중이 아니면 첫 곡 자동 재생 (play 내부에서 QueueUpdated broadcast)
        const status = await this.playerService.getStatus(roomId);
        this.logger.debug(
          `[AutoDJ] batchComplete: roomId=${roomId}, isPlaying=${status?.isPlaying}, trackCount=${tracks.length}, firstTrackId=${tracks[0]?.id}`,
        );
        if (!status?.isPlaying && tracks.length > 0) {
          await this.playerService.play(roomId, tracks[0].id).catch((e) => {
            this.logger.warn(`[AutoDJ] auto-play failed: ${e instanceof Error ? e.message : e}`);
          });
          const newStatus = await this.playerService.getStatus(roomId);
          this.gateway.broadcastSystem(roomId, WsEvent.PlaybackUpdated, '', newStatus);
        } else {
          // 재생 중이면 큐만 업데이트
          const queue = await this.queueRepo.find({
            where: { room: { id: roomId }, played: false },
            order: { position: 'ASC' },
            relations: ['track', 'addedBy'],
          });
          this.gateway.broadcastSystem(roomId, WsEvent.QueueUpdated, '', { queue });
        }
      })();
    });
  }

  private async broadcastPlayback(roomId: string) {
    const status = await this.playerService.getStatus(roomId);
    this.gateway.broadcastSystem(roomId, WsEvent.PlaybackUpdated, '', status);
  }

  /** metaStatus가 done이 될 때까지 대기 후 가사 검색 */
  private searchLyricsWhenReady(roomId: string, track: Track, broadcast = false): void {
    const doSearch = (t: Track) => {
      this.lyricsService
        .getLyrics(t.name, t.durationMs / 1000, t.artist, t.sourceId, t.songTitle, t.songArtist, t.id)
        .then(async (r) => {
          if (!broadcast) return;
          // 아직 같은 곡 재생 중인지 확인
          const current = await this.playerService.getStatus(roomId);
          if (current?.track?.id !== t.id) return;
          this.gateway.broadcastSystem(roomId, WsEvent.LyricsResult, '', {
            status: r?.syncedLyrics ? LyricsStatus.Found : LyricsStatus.NotFound,
            lyricsType: r?.lyricsType ?? null,
          });
        })
        .catch(async () => {
          if (!broadcast) return;
          const current = await this.playerService.getStatus(roomId);
          if (current?.track?.id !== t.id) return;
          this.gateway.broadcastSystem(roomId, WsEvent.LyricsResult, '', { status: LyricsStatus.NotFound });
        });
    };

    if (track.metaStatus === 'done') {
      doSearch(track);
      return;
    }

    // pending → 500ms 간격으로 최대 10회 폴링
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      const fresh = await this.queueRepo.manager.findOneBy(Track, { id: track.id });
      if (fresh?.metaStatus === 'done' || attempts >= 10) {
        clearInterval(poll);
        doSearch(fresh ?? track);
      }
    }, 500);
  }

  @Put(':roomId/play')
  @UseGuards(JwtAuthGuard, ControllerGuard)
  @ApiOperation({ summary: '트랙 재생' })
  @ApiBearerAuth()
  @ApiBody({ schema: { properties: { trackId: { type: 'string' } } } })
  async play(@Param('roomId', ParseUUIDPipe) roomId: string, @Body('trackId') trackId: string) {
    const r = await this.playerService.play(roomId, trackId);
    await this.broadcastPlayback(roomId);
    return r;
  }

  @Put(':roomId/pause')
  @UseGuards(JwtAuthGuard, ControllerGuard)
  @ApiOperation({ summary: '일시정지' })
  @ApiBearerAuth()
  async pause(@Param('roomId', ParseUUIDPipe) roomId: string) {
    const r = await this.playerService.pause(roomId);
    await this.broadcastPlayback(roomId);
    return r;
  }

  @Put(':roomId/resume')
  @UseGuards(JwtAuthGuard, ControllerGuard)
  @ApiOperation({ summary: '재생 재개' })
  @ApiBearerAuth()
  async resume(@Param('roomId', ParseUUIDPipe) roomId: string) {
    const r = await this.playerService.resume(roomId);
    await this.broadcastPlayback(roomId);
    return r;
  }

  @Put(':roomId/skip')
  @UseGuards(JwtAuthGuard, ControllerGuard)
  @ApiOperation({ summary: '다음 곡' })
  @ApiBearerAuth()
  async skip(@Param('roomId', ParseUUIDPipe) roomId: string, @Req() req: AuthenticatedRequest) {
    this.gateway.broadcastSystem(roomId, WsEvent.PlaybackUpdated, '', { streamState: 'skipping' });
    const r = await this.playerService.skip(roomId);
    this.gateway.broadcastSystem(roomId, WsEvent.TrackSkipped, `${req.user.nickname ?? ''}님이 곡을 스킵했습니다`);
    await this.broadcastPlayback(roomId);
    return r;
  }

  @Put(':roomId/previous')
  @UseGuards(JwtAuthGuard, ControllerGuard)
  @ApiOperation({ summary: '이전 곡' })
  @ApiBearerAuth()
  async previous(@Param('roomId', ParseUUIDPipe) roomId: string, @Req() req: AuthenticatedRequest) {
    this.gateway.broadcastSystem(roomId, WsEvent.PlaybackUpdated, '', { streamState: 'skipping' });
    await this.playerService.previous(roomId);
    this.gateway.broadcastSystem(
      roomId,
      WsEvent.TrackPrevious,
      `${req.user.nickname ?? ''}님이 이전 곡으로 돌아갔습니다`,
    );
    await this.broadcastPlayback(roomId);
    return { success: true };
  }

  @Post(':roomId/vote-skip')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '투표 스킵' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, type: VoteSkipResponse })
  async voteSkip(@Param('roomId', ParseUUIDPipe) roomId: string, @Req() req: AuthenticatedRequest) {
    const { permissions } = await this.memberService.getEffectivePermissions(roomId, req.user.userId);
    if (!permissions.includes(Permission.VoteSkip)) throw new AppException(ErrorCode.PLAYER_006);

    const eligible = await this.memberService.getVoteSkipEligibleCount(roomId);
    const r = await this.playerService.voteSkip(roomId, req.user.userId, eligible);
    const nick = req.user.nickname;

    this.gateway.broadcastSystem(
      roomId,
      WsEvent.VoteSkipRequested,
      `${nick}님이 스킵 투표를 요청했습니다 (${r.currentVotes}/${r.required})`,
    );
    this.gateway.broadcastSystem(roomId, WsEvent.VoteUpdated, '', {
      currentVotes: r.currentVotes,
      required: r.required,
    });

    if (r.skipped) {
      this.gateway.broadcastSystem(roomId, WsEvent.PlaybackUpdated, '', { streamState: 'skipping' });
      this.gateway.broadcastSystem(roomId, WsEvent.VoteSkipPassed, '스킵 투표가 통과되어 곡이 넘어갑니다');
    }

    await this.broadcastPlayback(roomId);
    return r;
  }

  @Get(':roomId/lyrics')
  @ApiOperation({ summary: '가사 조회' })
  @ApiResponse({ status: 200, type: LyricsResponse })
  async lyrics(@Param('roomId', ParseUUIDPipe) roomId: string): Promise<LyricsResponse> {
    const status = await this.playerService.getStatus(roomId);
    if (!status?.track) throw new AppException(ErrorCode.PLAYER_001);

    const track = await this.queueRepo.manager
      .createQueryBuilder(Track, 't')
      .addSelect('t.lyricsData')
      .addSelect('t.lyricsRuby')
      .addSelect('t.lyricsTranslated')
      .where('t.id = :id', { id: status.track.id })
      .getOne();

    // 가사가 아직 없으면 검색
    if (!track?.lyricsData && track?.lyricsStatus !== 'not_found') {
      const result = await this.lyricsService.getLyrics(
        status.track.name,
        status.track.durationMs / 1000,
        status.track.artist,
        status.track.sourceId,
        status.track.songTitle,
        status.track.songArtist,
        status.track.id,
      );
      if (result?.syncedLyrics) {
        // 번역 enqueue (한국어 제외)
        if (this.translationService.isEnabled && result.lang !== 'ko') {
          this.translationService.enqueue(status.track.id, roomId);
        }
        return {
          syncedLyrics: result.syncedLyrics,
          lang: result.lang ?? null,
          ruby: null,
          translated: null,
          transStatus: null,
        };
      }
      return { syncedLyrics: null, lang: null, ruby: null, translated: null, transStatus: null };
    }

    // 번역 enqueue (한국어 제외, 아직 안 됐으면)
    if (
      track?.lyricsData &&
      this.translationService.isEnabled &&
      track.lyricsLang !== 'ko' &&
      (!track.lyricsTransStatus || track.lyricsTransStatus === 'failed')
    ) {
      this.translationService.enqueue(status.track.id, roomId);
    }

    return {
      syncedLyrics: track?.lyricsData ?? null,
      lang: track?.lyricsLang ?? null,
      ruby: track?.lyricsRuby ?? null,
      translated: track?.lyricsTranslated ?? null,
      transStatus: track?.lyricsTransStatus ?? null,
    };
  }

  @Get(':roomId')
  @ApiOperation({ summary: '재생 상태 조회' })
  @ApiResponse({ status: 200, type: PlaybackStatus })
  getStatus(@Param('roomId', ParseUUIDPipe) roomId: string) {
    return this.playerService.getStatus(roomId);
  }
}
