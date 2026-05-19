import { Body, Controller, Get, Logger, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RoomQueue } from '../entities/room-queue.entity.js';
import { Track } from '../entities/track.entity.js';
import { AppException } from '../exceptions/app.exception.js';
import { ControllerGuard } from '../guards/controller.guard.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { MemberService } from '../rooms/member.service.js';
import { RoomsGateway } from '../rooms/rooms.gateway.js';
import { SearchService } from '../search/search.service.js';
import { AutoDjService } from '../services/auto-dj.service.js';
import { LyricsService } from '../services/lyrics.service.js';
import { TranslationService } from '../services/translation.service.js';
import { ErrorCode } from '../types/error-code.enum.js';
import type { AuthenticatedRequest, AutoDjStatus } from '../types/index.js';
import { LyricsStatus, Permission, PushEvent, WsEvent } from '../types/index.js';
import { MetaStatus } from '../types/meta-status.enum.js';
import { PUSH_EVENT, pushPayload } from '../types/push-event-payload.js';
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
    private readonly searchService: SearchService,
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(RoomQueue) private readonly queueRepo: Repository<RoomQueue>,
  ) {}

  @OnEvent('translation.updated')
  handleTranslationUpdated(trackId: string, roomIds: string[]): void {
    for (const roomId of roomIds) {
      this.gateway.broadcastSystem(roomId, WsEvent.LyricsUpdated, '', { trackId });
    }
  }

  @OnEvent('player.trackChanged')
  async handleTrackChanged(roomId: string): Promise<void> {
    const status = await this.playerService.getStatus(roomId);
    this.gateway.broadcastSystem(roomId, WsEvent.PlaybackUpdated, '', status);
    const queue = await this.queueRepo.find({
      where: { room: { id: roomId }, played: false },
      order: { position: 'ASC' },
      relations: ['track', 'addedBy'],
    });
    this.gateway.broadcastSystem(roomId, WsEvent.QueueUpdated, '', { queue });

    if (status?.track) {
      if (status.track.metaStatus !== MetaStatus.Matched) {
        this.searchService
          .enrichTrackCredits(status.track.id, status.track.sourceId)
          .catch((e: unknown) => this.logger.warn(`[enrich retry] ${(e as Error).message}`));
      }
      this.searchLyricsWhenReady(roomId, status.track, true);
      if (status.streamState === 'streaming') {
        this.eventEmitter.emit(
          PUSH_EVENT,
          pushPayload(PushEvent.TrackChanged, {
            roomId,
            userIds: this.gateway.getRoomUserIds(roomId),
            icon: status.track.thumbnail ?? undefined,
            image: status.track.thumbnail ?? undefined,
            tag: `track:${roomId}`,
            data: { trackName: status.track.name, artist: status.track.artist },
          }),
        );
      }
    }
    for (const q of queue.slice(0, 3)) {
      this.searchLyricsWhenReady(roomId, q.track);
    }

    this.autoDjService.resetFailCount(roomId);
    this.autoDjService.trigger(roomId);
    this.autoDjService
      .onTrackChanged(roomId)
      .catch((e: unknown) => this.logger.warn(`[onTrackChanged] ${(e as Error).message}`));
  }

  @OnEvent('player.playFail')
  handlePlayFail(roomId: string, trackTitle: string): void {
    this.gateway.broadcastSystem(roomId, WsEvent.TrackUnavailable, '', { trackName: trackTitle });
  }

  // ─── AutoDJ Event Listeners ───

  @OnEvent('autodj.status')
  handleAutoDjStatus(roomId: string, status: AutoDjStatus, reason?: string): void {
    this.gateway.broadcastSystem(roomId, WsEvent.AutoDjStatus, '', { status, reason });
    if (status === 'disabled') this.gateway.broadcastSystem(roomId, WsEvent.RoomUpdated, '');
  }

  @OnEvent('autodj.trackAdded')
  handleAutoDjTrackAdded(roomId: string, track: Track): void {
    this.gateway.broadcastSystem(roomId, WsEvent.TrackAdded, '', { trackName: track.name });
  }

  @OnEvent('autodj.systemMessage')
  handleAutoDjSystemMessage(roomId: string, message: string): void {
    this.gateway.broadcastSystem(roomId, WsEvent.SystemMessage, message);
  }

  @OnEvent('autodj.enrich')
  handleAutoDjEnrich(roomId: string, tracks: Track[]): void {
    Promise.all(tracks.map((t) => this.searchService.enrichTrackCredits(t.id, t.sourceId)))
      .then(() => this.broadcastQueue(roomId))
      .catch((e: unknown) => this.logger.warn(`[autodj.enrich] ${(e as Error).message}`));
  }

  @OnEvent('autodj.batchComplete')
  handleAutoDjBatchComplete(roomId: string, tracks: Track[]): void {
    void (async () => {
      const status = await this.playerService.getStatus(roomId);
      if (!status?.isPlaying && tracks.length > 0) {
        await this.playerService.play(roomId, tracks[0].id).catch((e: unknown) => {
          this.logger.warn(`[AutoDJ] auto-play failed: ${e instanceof Error ? e.message : e}`);
        });
        await this.broadcastPlayback(roomId);
      } else {
        await this.broadcastQueue(roomId);
      }
    })();
  }

  private async broadcastPlayback(roomId: string) {
    const status = await this.playerService.getStatus(roomId);
    this.gateway.broadcastSystem(roomId, WsEvent.PlaybackUpdated, '', status);
  }

  private async broadcastQueue(roomId: string) {
    const queue = await this.queueRepo.find({
      where: { room: { id: roomId }, played: false },
      order: { position: 'ASC' },
      relations: ['track', 'addedBy'],
    });
    this.gateway.broadcastSystem(roomId, WsEvent.QueueUpdated, '', { queue });
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

    if (track.metaStatus !== MetaStatus.Pending) {
      doSearch(track);
      return;
    }

    // pending → 500ms 간격으로 최대 10회 폴링
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      const fresh = await this.queueRepo.manager.findOneBy(Track, { id: track.id });
      if (fresh?.metaStatus !== MetaStatus.Pending || attempts >= 10) {
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
    this.gateway.broadcastSystem(roomId, WsEvent.TrackSkipped, '', { nickname: req.user.nickname ?? '' });
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
      this.gateway.broadcastSystem(roomId, WsEvent.VoteSkipPassed, '');
      this.eventEmitter.emit(
        PUSH_EVENT,
        pushPayload(PushEvent.VoteSkipPassed, {
          roomId,
          userIds: this.gateway.getRoomUserIds(roomId),
          excludeUserId: req.user.userId,
          tag: `skip:${roomId}`,
          data: {},
        }),
      );
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
    if (!track?.lyricsData && track?.lyricsStatus !== LyricsStatus.NotFound) {
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
