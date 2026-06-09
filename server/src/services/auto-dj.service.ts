import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  AUTODJ_DEBOUNCE_MS,
  AUTODJ_FRESHNESS_HARD_EXCLUDE,
  AUTODJ_FRESHNESS_HISTORY_DEPTH,
  AUTODJ_MAX_FAIL_COUNT,
  AUTODJ_SAME_ARTIST_HARD_LIMIT,
  AUTODJ_SAME_ARTIST_SOFT_LIMIT,
  AUTODJ_SCAN_INTERVAL_MS,
} from '../constants.js';
import { PlayHistory } from '../entities/play-history.entity.js';
import { Room } from '../entities/room.entity.js';
import { RoomQueue } from '../entities/room-queue.entity.js';
import { Track } from '../entities/track.entity.js';
import { AutoDjMode, MetaStatus } from '../types/index.js';
import { OptionKey } from '../types/settings.types.js';
import type { CandidatePool, PoolEntry, WeightedCandidate } from './auto-dj-candidates.service.js';
import { AutoDjCandidateService } from './auto-dj-candidates.service.js';
import { SettingsService } from './settings.service.js';

@Injectable()
export class AutoDjService {
  private readonly logger = new Logger(AutoDjService.name);
  private readonly processing = new Set<string>();
  private readonly failCounts = new Map<string, number>();
  private readonly debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly pools = new Map<string, CandidatePool>();

  constructor(
    @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
    @InjectRepository(RoomQueue) private readonly queueRepo: Repository<RoomQueue>,
    @InjectRepository(PlayHistory) private readonly historyRepo: Repository<PlayHistory>,
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    private readonly candidateService: AutoDjCandidateService,
    private readonly settings: SettingsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** 이벤트 기반 트리거 (디바운스) */
  trigger(roomId: string): void {
    this.logger.debug(`[AutoDJ] trigger for ${roomId}`);
    const existing = this.debounceTimers.get(roomId);
    if (existing) clearTimeout(existing);
    this.debounceTimers.set(
      roomId,
      setTimeout(() => {
        this.debounceTimers.delete(roomId);
        void this.checkAndFill(roomId);
      }, AUTODJ_DEBOUNCE_MS),
    );
    if (!this.pools.has(roomId) || !this.pools.get(roomId)!.candidates.length) {
      this.refreshPool(roomId).catch((e: unknown) => this.logger.warn(`[refreshPool] ${(e as Error).message}`));
    }
  }

  /** 안전망: 전체 활성 방 스캔 */
  @Interval(AUTODJ_SCAN_INTERVAL_MS)
  async scanAll(): Promise<void> {
    const rooms = await this.roomRepo.find({
      where: { isActive: true, autoDjEnabled: true },
      select: ['id'],
    });
    for (const room of rooms) {
      if (!this.processing.has(room.id)) {
        void this.checkAndFill(room.id);
      }
    }
  }

  /** 메인 로직 */
  private async checkAndFill(roomId: string): Promise<void> {
    if (this.processing.has(roomId)) return;

    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room?.autoDjEnabled || !room.isActive || room.autoDjPaused) return;

    const failCount = this.failCounts.get(roomId) ?? 0;
    if (failCount >= AUTODJ_MAX_FAIL_COUNT) return;

    const remaining = await this.queueRepo.countBy({ room: { id: roomId }, played: false });
    if (remaining > room.autoDjThreshold) return;

    this.processing.add(roomId);
    try {
      this.eventEmitter.emit('autodj.status', roomId, 'thinking');

      const toAdd = room.autoDjThreshold - remaining + 1;
      const picks = await this.pickTracks(roomId, room, toAdd);

      if (!picks.length) {
        this.failCounts.set(roomId, (this.failCounts.get(roomId) ?? 0) + 1);
        if ((this.failCounts.get(roomId) ?? 0) >= AUTODJ_MAX_FAIL_COUNT) {
          await this.disableAutoDj(roomId, 'noCandidates');
        } else {
          this.eventEmitter.emit('autodj.systemMessage', roomId, 'autoDjRetry');
        }
        return;
      }

      this.eventEmitter.emit('autodj.status', roomId, 'adding');

      const maxPos = await this.queueRepo
        .createQueryBuilder('q')
        .select('COALESCE(MAX(q.position), 0)', 'max')
        .where('q.room_id = :roomId', { roomId })
        .getRawOne<{ max: number }>();
      let nextPos = (maxPos?.max ?? 0) + 1;

      const added: Track[] = [];
      for (const track of picks) {
        const freshRoom = await this.roomRepo.findOneBy({ id: roomId });
        if (!freshRoom?.autoDjEnabled) break;

        await this.queueRepo.save(
          this.queueRepo.create({
            room: { id: roomId },
            track: { id: track.id },
            addedBy: null,
            isAutoDj: true,
            position: nextPos++,
          }),
        );
        added.push(track);
        this.removeFromPool(roomId, track.id);
        this.eventEmitter.emit('autodj.trackAdded', roomId, track);
      }

      if (added.length) {
        this.failCounts.delete(roomId);
        this.logger.log(
          `[AutoDJ] Added ${added.length} track(s) to room ${roomId}: ${added.map((t) => t.name).join(', ')}`,
        );
        this.eventEmitter.emit('autodj.batchComplete', roomId, added);
      }
    } catch (e) {
      this.failCounts.set(roomId, (this.failCounts.get(roomId) ?? 0) + 1);
      this.logger.warn(`[AutoDJ] Failed for room ${roomId}`, e instanceof Error ? e.message : e);
    } finally {
      this.processing.delete(roomId);
      this.eventEmitter.emit('autodj.status', roomId, 'idle');
    }
  }

  private async pickTracks(roomId: string, room: Room, count: number): Promise<Track[]> {
    const candidates = await this.getCandidates(roomId, room.autoDjMode, room);
    if (!candidates.length) return [];

    let filtered = await this.filterFreshness(candidates, roomId);
    if (!filtered.length && room.autoDjMode === AutoDjMode.Favorites && room.autoDjFavFallbackMixed) {
      const mixed = await this.candidateService.getMixedCandidates(roomId);
      filtered = await this.filterFreshness(mixed, roomId);
    }
    if (!filtered.length) {
      await this.disableAutoDj(roomId, 'autoDjFreshness');
      return [];
    }

    const sorted = filtered.sort((a, b) => b.weight - a.weight);
    const picks: Track[] = [];

    for (const candidate of sorted) {
      if (picks.length >= count) break;
      const dup = await this.queueRepo.findOneBy({
        room: { id: roomId },
        track: { id: candidate.track.id },
        played: false,
      });
      if (dup) continue;
      picks.push(candidate.track);
    }
    return picks;
  }

  private removeFromPool(roomId: string, trackId: string): void {
    const pool = this.pools.get(roomId);
    if (!pool) return;
    pool.candidates = pool.candidates.filter((c) => c.track.id !== trackId);
  }

  resetFailCount(roomId: string): void {
    this.failCounts.delete(roomId);
  }

  // ─── 후보 소스 (위임) ──────────────────────────────────────

  private async disableAutoDj(roomId: string, reason: string): Promise<void> {
    await this.roomRepo.update(roomId, { autoDjEnabled: false });
    this.logger.warn(`[AutoDJ] Disabled for room ${roomId}: ${reason}`);
    this.eventEmitter.emit('autodj.status', roomId, 'disabled', reason);
    this.eventEmitter.emit('autodj.systemMessage', roomId, reason);
  }

  private async getCandidates(roomId: string, mode: AutoDjMode, room: Room): Promise<WeightedCandidate[]> {
    switch (mode) {
      case AutoDjMode.Radio:
        return this.candidateService.getRadioCandidates(roomId);
      case AutoDjMode.Related:
        return this.candidateService.getRelatedCandidates(roomId);
      case AutoDjMode.History:
        return this.candidateService.getHistoryCandidates(roomId);
      case AutoDjMode.Popular:
        return this.candidateService.getPopularCandidates();
      case AutoDjMode.Mixed:
        return this.candidateService.getMixedCandidates(roomId);
      case AutoDjMode.Favorites:
        return this.candidateService.getFavoritesCandidates(room);
      case AutoDjMode.AI:
        return this.getAiCandidates(roomId, room);
      case AutoDjMode.Chart:
        return this.candidateService.getChartCandidates(room);
    }
  }

  private async getAiCandidates(roomId: string, room: Room): Promise<WeightedCandidate[]> {
    const pool = this.pools.get(roomId);
    if (pool && pool.candidates.length > 0) {
      return pool.candidates.map((e) => ({ track: e.track, weight: e.pinned ? 10 : 1 }));
    }
    await this.refreshPool(roomId, room);
    const filled = this.pools.get(roomId);
    if (filled && filled.candidates.length > 0) {
      return filled.candidates.map((e) => ({ track: e.track, weight: e.pinned ? 10 : 1 }));
    }
    return [];
  }

  // ─── 신선도 필터 ─────────────────────────────────────────

  private async filterFreshness(candidates: WeightedCandidate[], roomId: string): Promise<WeightedCandidate[]> {
    const queueTrackIds = await this.queueRepo
      .find({ where: { room: { id: roomId }, played: false }, relations: ['track'], select: ['id', 'track'] })
      .then((qs) => qs.map((q) => q.track.id));

    const recentHistory = await this.historyRepo.find({
      where: { room: { id: roomId } },
      order: { playedAt: 'DESC' },
      take: AUTODJ_FRESHNESS_HARD_EXCLUDE,
    });
    const recentSourceIds = recentHistory.map((h) => h.sourceId);
    const recentTracks = recentSourceIds.length
      ? await this.trackRepo.find({ where: recentSourceIds.map((yid) => ({ sourceId: yid })) })
      : [];
    const recentIds = recentTracks.map((t) => t.id);
    const excluded = new Set([...queueTrackIds, ...recentIds]);

    let filtered = candidates.filter((c) => !excluded.has(c.track.id));

    const deepHistory = await this.historyRepo.find({
      where: { room: { id: roomId } },
      order: { playedAt: 'DESC' },
      take: AUTODJ_FRESHNESS_HISTORY_DEPTH,
    });
    const deepTracks = deepHistory.length
      ? await this.trackRepo.find({ where: deepHistory.map((h) => ({ sourceId: h.sourceId })) })
      : [];
    const deepTrackMap = new Map(deepTracks.map((t) => [t.sourceId, t]));
    const historyIndex = new Map(
      deepHistory
        .map((h, i) => [deepTrackMap.get(h.sourceId)?.id, i] as const)
        .filter((entry): entry is [string, number] => entry[0] !== undefined),
    );

    const recentArtists = recentHistory.map((h) => h.artist).filter((x): x is string => typeof x === 'string');

    filtered = filtered.map((c) => {
      let { weight } = c;

      const idx = historyIndex.get(c.track.id);
      if (idx !== undefined) {
        const recency = 1 - idx / AUTODJ_FRESHNESS_HISTORY_DEPTH;
        weight *= 1 - 0.5 * recency;
      }

      const artist = c.track.artist;
      if (artist) {
        const hardIdx = recentArtists.slice(0, AUTODJ_SAME_ARTIST_HARD_LIMIT).indexOf(artist);
        const softIdx = recentArtists.slice(0, AUTODJ_SAME_ARTIST_SOFT_LIMIT).indexOf(artist);
        if (hardIdx >= 0) weight *= 0.1;
        else if (softIdx >= 0) weight *= 0.5;
      }

      return { ...c, weight };
    });

    return filtered.filter((c) => c.weight > 0);
  }

  // ─── 풀 관리 ─────────────────────────────────────────────

  async refreshPool(roomId: string, room?: Room): Promise<void> {
    const existing = this.pools.get(roomId);
    if (existing?.refreshing) return;

    const r = room ?? (await this.roomRepo.findOneBy({ id: roomId }));
    if (!r || r.autoDjPaused) return;

    const pool: CandidatePool = existing ?? {
      candidates: [],
      refreshing: false,
      usedSourceIds: new Set(),
      basedOnSourceId: null,
    };
    pool.refreshing = true;
    this.pools.set(roomId, pool);

    try {
      const batchSize = this.settings.getNumber(OptionKey.AutoDjBatchSize, 15);
      const pinned = pool.candidates.filter((e) => e.pinned);

      if (r.autoDjMode === AutoDjMode.AI) {
        await this.candidateService.refreshAiPoolInternal(roomId, r, pool, batchSize);
      } else {
        const raw = await this.getCandidates(roomId, r.autoDjMode, r);
        const filtered = await this.filterFreshness(raw, roomId);
        const pinnedIds = new Set(pinned.map((p) => p.track.id));
        const newCandidates: PoolEntry[] = [...pinned];
        for (const c of filtered) {
          if (newCandidates.length >= batchSize) break;
          if (pinnedIds.has(c.track.id)) continue;
          if (newCandidates.some((e) => e.track.id === c.track.id)) continue;
          if (pool.usedSourceIds.has(c.track.sourceId)) continue;
          newCandidates.push({ track: c.track, pinned: false });
        }
        if (newCandidates.length <= pinned.length && filtered.length > 0) {
          pool.usedSourceIds.clear();
          for (const c of filtered) {
            if (newCandidates.length >= batchSize) break;
            if (pinnedIds.has(c.track.id)) continue;
            if (newCandidates.some((e) => e.track.id === c.track.id)) continue;
            newCandidates.push({ track: c.track, pinned: false });
          }
        }
        pool.candidates = newCandidates;
      }

      pool.basedOnSourceId = await this.candidateService.getCurrentVideoId(roomId);
      this.logger.log(`[AutoDJ] Pool refreshed for ${roomId} (${r.autoDjMode}): ${pool.candidates.length} candidates`);

      const pending = pool.candidates.filter((c) => c.track.metaStatus === MetaStatus.Pending).map((c) => c.track);
      if (pending.length) this.eventEmitter.emit('autodj.enrich', roomId, pending);
    } finally {
      pool.refreshing = false;
    }
  }

  /** 후보 목록 조회 (API용) */
  getPoolCandidates(roomId: string): PoolEntry[] {
    return this.pools.get(roomId)?.candidates ?? [];
  }

  /** 큐 변경 시 풀에서 중복 제거 + 부족하면 리필 */
  async syncPoolWithQueue(roomId: string): Promise<void> {
    const pool = this.pools.get(roomId);
    if (!pool || !pool.candidates.length) return;

    const queueTrackIds = await this.queueRepo
      .find({ where: { room: { id: roomId }, played: false }, relations: ['track'], select: ['id', 'track'] })
      .then((qs) => new Set(qs.map((q) => q.track.id)));

    const before = pool.candidates.length;
    pool.candidates = pool.candidates.filter((c) => c.pinned || !queueTrackIds.has(c.track.id));

    if (pool.candidates.length < before) {
      this.logger.debug(`[AutoDJ] Pool sync: removed ${before - pool.candidates.length} duplicates for ${roomId}`);
    }
  }

  /** 곡 전환 시 호출 — related/radio 모드면 풀 갱신 */
  async onTrackChanged(roomId: string): Promise<void> {
    const pool = this.pools.get(roomId);
    if (!pool) return;

    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) return;

    const currentSourceId = await this.candidateService.getCurrentVideoId(roomId);
    const needsRefresh =
      (room.autoDjMode === AutoDjMode.Related ||
        room.autoDjMode === AutoDjMode.Radio ||
        room.autoDjMode === AutoDjMode.Mixed) &&
      currentSourceId !== pool.basedOnSourceId;

    if (needsRefresh) {
      this.refreshPool(roomId, room).catch((e: unknown) => this.logger.warn(`[refreshPool] ${(e as Error).message}`));
    }
  }

  /** 방 삭제/비활성화 시 풀 정리 */
  cleanupRoom(roomId: string): void {
    this.pools.delete(roomId);
    this.processing.delete(roomId);
    this.failCounts.delete(roomId);
    this.debounceTimers.delete(roomId);
  }

  /** 모드 변경 시 풀 초기화 */
  clearPool(roomId: string): void {
    this.pools.delete(roomId);
  }

  /** 후보 핀 토글 */
  pinAiCandidate(roomId: string, trackId: string): void {
    const pool = this.pools.get(roomId);
    if (!pool) return;
    const entry = pool.candidates.find((c) => c.track.id === trackId);
    if (entry) entry.pinned = !entry.pinned;
  }

  /** 후보 스킵 (제거) */
  skipAiCandidate(roomId: string, trackId: string): void {
    const pool = this.pools.get(roomId);
    if (!pool) return;
    const entry = pool.candidates.find((c) => c.track.id === trackId);
    if (entry) pool.usedSourceIds.add(entry.track.sourceId);
    pool.candidates = pool.candidates.filter((c) => c.track.id !== trackId);
  }

  /** 후보를 풀에서 제거하고 Track 반환 (큐 투입용) */
  removeCandidate(roomId: string, trackId: string): Track | null {
    const pool = this.pools.get(roomId);
    if (!pool) return null;
    const idx = pool.candidates.findIndex((c) => c.track.id === trackId);
    if (idx < 0) return null;
    const [entry] = pool.candidates.splice(idx, 1);
    return entry.track;
  }
}
