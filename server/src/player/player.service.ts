import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { SKIP_MIN_PLAY_MS, TRACK_END_DELAY_MS, VOTE_SKIP_DIVISOR, VOTE_SKIP_MIN_REQUIRED } from '../constants.js';
import { AppException } from '../exceptions/app.exception.js';
import { ErrorCode } from '../types/error-code.enum.js';
import { RoomPlayback } from '../entities/room-playback.entity.js';
import { PlayHistory } from '../entities/play-history.entity.js';
import { RoomQueue } from '../entities/room-queue.entity.js';
import { Room } from '../entities/room.entity.js';
import { Track } from '../entities/track.entity.js';
import { TrackStats } from '../entities/track-stats.entity.js';
import { User } from '../entities/user.entity.js';
import { UserTrackHistory } from '../entities/user-track-history.entity.js';
import { AudioService } from '../services/audio.service.js';
import { PreloadService } from '../services/preload.service.js';
import { YtdlpService } from '../services/ytdlp.service.js';
import type { StreamState } from '../types/index.js';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);
  private skipVotes = new Map<string, Set<string>>();
  private streamState = new Map<string, StreamState>();
  private onTrackChangeCallback?: (roomId: string) => void;
  private onPlayFailCallback?: (roomId: string, trackTitle: string) => void;
  /** 현재 재생 중인 곡의 신청자 (completed 추적용) */
  private currentAddedBy = new Map<string, string>();
  /** skip으로 종료된 건지 구분 */
  private skippedRooms = new Set<string>();

  constructor(
    private readonly audio: AudioService,
    private readonly ytdlp: YtdlpService,
    private readonly preload: PreloadService,
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    @InjectRepository(RoomPlayback) private readonly playbackRepo: Repository<RoomPlayback>,
    @InjectRepository(RoomQueue) private readonly queueRepo: Repository<RoomQueue>,
    @InjectRepository(TrackStats) private readonly statsRepo: Repository<TrackStats>,
    @InjectRepository(UserTrackHistory) private readonly userHistoryRepo: Repository<UserTrackHistory>,
    @InjectRepository(PlayHistory) private readonly playHistoryRepo: Repository<PlayHistory>,
  ) {}

  // --- Playback ---

  async play(roomId: string, trackId: string): Promise<RoomPlayback> {
    const track = await this.trackRepo.findOneBy({ id: trackId });
    if (!track) throw new AppException(ErrorCode.COMMON_002);

    // 신청자 정보 조회 (stats용)
    const queueItem = await this.queueRepo.findOne({
      where: { room: { id: roomId }, track: { id: trackId } },
      relations: ['addedBy'],
    });
    const addedByUserId = queueItem?.addedBy?.id;
    if (addedByUserId) this.currentAddedBy.set(roomId, addedByUserId);

    await this.queueRepo.update({ room: { id: roomId }, track: { id: trackId }, played: false }, { played: true });

    this.clearVotes(roomId);
    this.skippedRooms.delete(roomId);
    this.streamState.set(roomId, 'preparing');

    const pb = await this.playbackRepo.save(
      this.playbackRepo.create({ roomId, track, isPlaying: true, startedAt: new Date(), positionMs: 0 }),
    );

    // preparing 상태 즉시 broadcast (클라이언트가 트랙 정보 + 준비 중 상태를 받음)
    this.onTrackChangeCallback?.(roomId);

    // 글로벌 stats/history UPSERT (fire-and-forget)
    this.recordPlay(roomId, track, addedByUserId).catch((e) =>
      this.logger.warn('recordPlay failed', e instanceof Error ? e.message : e),
    );

    const audioBuffer = this.preload.getBuffer(trackId);
    let url = '';
    if (!audioBuffer) {
      try {
        url = await this.ytdlp.getAudioUrl(track.sourceId);
      } catch {
        // URL도 못 받으면 재생 불가 → 스킵
        this.logger.warn(`[${roomId}] Play failed: cannot get audio for ${track.sourceId}`);
        this.preload.release(trackId);
        this.streamState.set(roomId, 'idle');
        this.onPlayFailCallback?.(roomId, track.name);
        // 자동으로 다음 곡 시도
        void this.onTrackEnd(roomId);
        return pb;
      }
    }
    this.preload.release(trackId);

    await this.audio.startStream(
      roomId,
      url,
      () => this.onTrackEnd(roomId),
      () => this.ytdlp.getAudioUrl(track.sourceId),
      async () => {
        this.streamState.set(roomId, 'streaming');
        await this.playbackRepo.update(roomId, { startedAt: new Date() });
        this.onTrackChangeCallback?.(roomId);
      },
      audioBuffer ?? undefined,
      track.bitrateKbps || undefined,
    );

    this.preload.triggerPreload(roomId);

    return pb;
  }

  async pause(roomId: string): Promise<void> {
    this.audio.pauseStream(roomId);
    await this.playbackRepo.update(roomId, { isPlaying: false });
  }

  async resume(roomId: string): Promise<void> {
    this.audio.resumeStream(roomId);
    await this.playbackRepo.update(roomId, { isPlaying: true });
  }

  private assertNotTransitioning(roomId: string): void {
    const state = this.streamState.get(roomId);
    if (state === 'preparing' || state === 'skipping') {
      throw new AppException(ErrorCode.PLAYER_004);
    }
  }

  async skip(roomId: string): Promise<void> {
    this.assertNotTransitioning(roomId);
    await this.assertMinPlayTime(roomId);
    await this.assertNextTrackExists(roomId);
    this.doSkip(roomId);
  }

  async previous(roomId: string): Promise<void> {
    this.assertNotTransitioning(roomId);
    await this.assertMinPlayTime(roomId);

    const pb = await this.playbackRepo.findOne({ where: { roomId }, relations: ['track'] });
    if (!pb?.track) return;

    // 현재 곡의 큐 아이템
    const currentQueue = await this.queueRepo.findOne({
      where: { room: { id: roomId }, track: { id: pb.track.id }, played: true },
      order: { position: 'DESC' },
    });
    if (!currentQueue) return;

    // 현재 position보다 앞에 있는 played 곡
    const prev = await this.queueRepo.findOne({
      where: { room: { id: roomId }, played: true, position: LessThan(currentQueue.position) },
      order: { position: 'DESC' },
      relations: ['track'],
    });
    if (!prev) throw new AppException(ErrorCode.PLAYER_003);

    // 현재 곡 → 미재생으로 되돌리고 이전 곡 재생
    await this.queueRepo.update(currentQueue.id, { played: false });
    await this.queueRepo.update(prev.id, { played: false });
    this.audio.stopStream(roomId);
    await this.play(roomId, prev.track.id);
    this.onTrackChangeCallback?.(roomId);
  }

  // --- Vote skip ---

  async voteSkip(roomId: string, userId: string, totalMembers: number) {
    this.assertNotTransitioning(roomId);
    await this.assertMinPlayTime(roomId);
    await this.assertNextTrackExists(roomId);
    if (!this.skipVotes.has(roomId)) this.skipVotes.set(roomId, new Set());
    const votes = this.skipVotes.get(roomId)!;
    votes.add(userId);
    const required = Math.max(VOTE_SKIP_MIN_REQUIRED, Math.ceil(totalMembers / VOTE_SKIP_DIVISOR));
    const skipped = votes.size >= required;
    if (skipped) this.doSkip(roomId);
    return { voted: true, currentVotes: votes.size, required, skipped };
  }

  clearVotes(roomId: string): void {
    this.skipVotes.delete(roomId);
  }

  getVoteStatus(roomId: string) {
    const votes = this.skipVotes.get(roomId);
    return { currentVotes: votes?.size ?? 0, voters: [...(votes ?? [])] };
  }

  // --- Status ---

  async getStatus(roomId: string) {
    const pb = await this.playbackRepo.findOne({ where: { roomId }, relations: ['track'] });
    if (!pb) return null;
    const state = this.streamState.get(roomId) ?? 'idle';
    const isIdle = state === 'idle' && !pb.isPlaying;
    const elapsedMs =
      state === 'streaming' && pb.isPlaying && pb.startedAt ? Date.now() - new Date(pb.startedAt).getTime() : 0;
    return Object.assign(pb, {
      track: isIdle ? null : pb.track,
      elapsedMs,
      streamCodec: 'aac',
      streamBitrate: pb.track?.bitrateKbps ?? 0,
      streamState: state,
    });
  }

  // --- Callbacks ---

  onTrackChange(cb: (roomId: string) => void): void {
    this.onTrackChangeCallback = cb;
  }

  onPlayFail(cb: (roomId: string, trackTitle: string) => void): void {
    this.onPlayFailCallback = cb;
  }

  triggerPreload(roomId: string): void {
    this.preload.triggerPreload(roomId);
  }

  // --- Guards ---

  private async assertMinPlayTime(roomId: string): Promise<void> {
    const pb = await this.playbackRepo.findOneBy({ roomId });
    if (pb?.startedAt && Date.now() - new Date(pb.startedAt).getTime() < SKIP_MIN_PLAY_MS) {
      throw new AppException(ErrorCode.PLAYER_005);
    }
  }

  private async assertNextTrackExists(roomId: string): Promise<void> {
    const next = await this.queueRepo.findOne({
      where: { room: { id: roomId }, played: false },
      order: { position: 'ASC' },
    });
    if (!next) throw new AppException(ErrorCode.PLAYER_002);
  }

  private doSkip(roomId: string): void {
    this.clearVotes(roomId);
    this.skippedRooms.add(roomId);
    this.audio.stopStream(roomId);
    this.streamState.set(roomId, 'skipping');
    void this.onTrackEnd(roomId);
  }

  // --- Internal ---

  private async onTrackEnd(roomId: string): Promise<void> {
    // 이미 preparing 중이면 무시 (중복 호출 방어)
    const currentState = this.streamState.get(roomId);
    if (currentState === 'preparing') return;
    const wasSkipped = this.skippedRooms.has(roomId);
    this.skippedRooms.delete(roomId);
    if (!wasSkipped) {
      const pb = await this.playbackRepo.findOne({ where: { roomId }, relations: ['track'] });
      const userId = this.currentAddedBy.get(roomId);
      if (pb?.track) {
        this.recordCompleted(pb.track.id, userId).catch((e) =>
          this.logger.warn('recordCompleted failed', e instanceof Error ? e.message : e),
        );
      }
    }
    this.currentAddedBy.delete(roomId);

    this.clearVotes(roomId);
    const next = await this.queueRepo.findOne({
      where: { room: { id: roomId }, played: false },
      order: { position: 'ASC' },
      relations: ['track'],
    });

    if (next) {
      this.streamState.set(roomId, 'preparing');
      this.onTrackChangeCallback?.(roomId);
      // 자연 종료 시에만 마지막 버퍼 재생 대기 (스킵은 즉시 전환)
      if (!wasSkipped) {
        await new Promise((r) => setTimeout(r, TRACK_END_DELAY_MS));
      }
      await this.queueRepo.update(next.id, { played: true });
      await this.play(roomId, next.track.id);
    } else {
      this.streamState.set(roomId, 'idle');
      const pb = await this.playbackRepo.findOneBy({ roomId });
      if (pb) {
        pb.isPlaying = false;
        pb.track = null;
        await this.playbackRepo.save(pb);
      }
      this.onTrackChangeCallback?.(roomId);
    }
  }

  private async recordPlay(roomId: string, track: Track, userId?: string): Promise<void> {
    const trackId = track.id;

    // TrackStats UPSERT
    const existing = await this.statsRepo.findOneBy({ trackId });
    if (existing) {
      existing.totalPlays++;
      existing.lastPlayedAt = new Date();
      // uniqueUsers는 user_track_history 기반으로 갱신
      if (userId) {
        const isNew = !(await this.userHistoryRepo.findOneBy({ trackId, userId }));
        if (isNew) existing.uniqueUsers++;
      }
      existing.score = this.calcScore(existing);
      await this.statsRepo.save(existing);
    } else {
      const stats = this.statsRepo.create({
        trackId,
        totalPlays: 1,
        uniqueUsers: userId ? 1 : 0,
        score: 1,
      });
      await this.statsRepo.save(stats);
    }

    // UserTrackHistory UPSERT
    if (userId) {
      const hist = await this.userHistoryRepo.findOneBy({ trackId, userId });
      if (hist) {
        hist.playCount++;
        hist.lastPlayedAt = new Date();
        await this.userHistoryRepo.save(hist);
      } else {
        await this.userHistoryRepo.save(this.userHistoryRepo.create({ trackId, userId, playCount: 1 }));
      }
    }

    // PlayHistory 기록 (메타 스냅샷 포함)
    await this.playHistoryRepo.save(
      this.playHistoryRepo.create({
        room: { id: roomId } as Room,
        playedBy: userId ? ({ id: userId } as User) : null,
        provider: track.provider,
        sourceId: track.sourceId,
        title: track.songTitle || track.name,
        artist: track.songArtist || track.artist,
        thumbnail: track.thumbnail,
        durationMs: track.durationMs,
      }),
    );
  }

  private async recordCompleted(trackId: string, userId?: string): Promise<void> {
    await this.statsRepo.increment({ trackId }, 'completedCount', 1);
    // score 재계산
    const stats = await this.statsRepo.findOneBy({ trackId });
    if (stats) {
      stats.score = this.calcScore(stats);
      await this.statsRepo.save(stats);
    }
    if (userId) {
      await this.userHistoryRepo.increment({ trackId, userId }, 'completedCount', 1);
    }
  }

  private calcScore(stats: TrackStats): number {
    const days = (Date.now() - stats.lastPlayedAt.getTime()) / 86400000;
    const decay = Math.pow(0.95, days);
    const completedRatio = stats.totalPlays > 0 ? stats.completedCount / stats.totalPlays : 0;
    return (
      (stats.totalPlays + stats.likes * 3 - stats.dislikes * 2 + stats.uniqueUsers * 2 + completedRatio * 5) * decay
    );
  }

  updateCodecInfo(track: Track): void {
    if (track.codec) return;
    void this.ytdlp
      .getAudioInfo(track.sourceId)
      .then(async (info) => {
        track.codec = info.codec;
        track.bitrateKbps = info.bitrateKbps;
        await this.trackRepo.update(track.id, { codec: info.codec, bitrateKbps: info.bitrateKbps });
      })
      .catch(() => {});
  }
}
