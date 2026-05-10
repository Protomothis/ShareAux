import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  AUTODJ_CANDIDATE_FETCH_LIMIT,
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
import { RoomPlayback } from '../entities/room-playback.entity.js';
import { RoomQueue } from '../entities/room-queue.entity.js';
import { Track } from '../entities/track.entity.js';
import { TrackStats } from '../entities/track-stats.entity.js';
import { UserFavorite } from '../entities/user-favorite.entity.js';
import type { AutoDjStatus, AutoDjTags } from '../types/index.js';
import { AutoDjMode } from '../types/index.js';
import { OptionKey } from '../types/settings.types.js';
import { Provider } from '../types/provider.enum.js';
import { fetchYtMusicRelated } from './innertube-parser.js';
import { SettingsService } from './settings.service.js';
import { type YtdlpSearchResult, YtdlpService } from './ytdlp.service.js';

interface WeightedCandidate {
  track: Track;
  weight: number;
}

interface AiPoolEntry {
  track: Track;
  pinned: boolean;
}

interface AiPool {
  candidates: AiPoolEntry[];
  refreshing: boolean;
  usedSourceIds: Set<string>;
}

@Injectable()
export class AutoDjService {
  private readonly logger = new Logger(AutoDjService.name);
  private readonly processing = new Set<string>();
  private readonly failCounts = new Map<string, number>();
  private readonly debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private statusCallback?: (roomId: string, status: AutoDjStatus, reason?: string) => void;
  private trackAddedCallback?: (roomId: string, track: Track) => void;
  private batchCompleteCallback?: (roomId: string, tracks: Track[]) => void;
  private systemMessageCallback?: (roomId: string, message: string) => void;
  private readonly aiPools = new Map<string, AiPool>();

  constructor(
    @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
    @InjectRepository(RoomQueue) private readonly queueRepo: Repository<RoomQueue>,
    @InjectRepository(RoomPlayback) private readonly playbackRepo: Repository<RoomPlayback>,
    @InjectRepository(PlayHistory) private readonly historyRepo: Repository<PlayHistory>,
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    @InjectRepository(TrackStats) private readonly statsRepo: Repository<TrackStats>,
    @InjectRepository(UserFavorite) private readonly favoriteRepo: Repository<UserFavorite>,
    private readonly ytdlp: YtdlpService,
    private readonly settings: SettingsService,
  ) {}

  onStatusChange(cb: (roomId: string, status: AutoDjStatus, reason?: string) => void): void {
    this.statusCallback = cb;
  }

  onTrackAdded(cb: (roomId: string, track: Track) => void): void {
    this.trackAddedCallback = cb;
  }

  onBatchComplete(cb: (roomId: string, tracks: Track[]) => void): void {
    this.batchCompleteCallback = cb;
  }

  onSystemMessage(cb: (roomId: string, message: string) => void): void {
    this.systemMessageCallback = cb;
  }

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
    if (!room?.autoDjEnabled || !room.isActive) {
      this.logger.debug(`[AutoDJ] skipped: enabled=${room?.autoDjEnabled} active=${room?.isActive}`);
      return;
    }

    const failCount = this.failCounts.get(roomId) ?? 0;
    if (failCount >= AUTODJ_MAX_FAIL_COUNT) return;

    const remaining = await this.queueRepo.countBy({ room: { id: roomId }, played: false });
    if (remaining > room.autoDjThreshold) return;

    this.processing.add(roomId);
    try {
      this.statusCallback?.(roomId, 'thinking');

      const toAdd = room.autoDjThreshold - remaining + 1;
      const candidates = await this.getCandidates(roomId, room.autoDjMode, room);
      if (!candidates.length) {
        this.logger.warn(`[AutoDJ] No candidates for room ${roomId}`);
        await this.disableAutoDj(roomId, '추가할 곡을 찾지 못했습니다. 먼저 곡을 신청해주세요.');
        return;
      }

      let filtered = await this.filterFreshness(candidates, roomId);
      if (!filtered.length && room.autoDjMode === AutoDjMode.Favorites && room.autoDjFavFallbackMixed) {
        const mixed = await this.getMixedCandidates(roomId);
        filtered = await this.filterFreshness(mixed, roomId);
      }
      if (!filtered.length) {
        await this.disableAutoDj(roomId, '최근 재생된 곡만 있어 새 곡을 추가하지 못했습니다.');
        return;
      }

      this.statusCallback?.(roomId, 'adding');

      const maxPos = await this.queueRepo
        .createQueryBuilder('q')
        .select('COALESCE(MAX(q.position), 0)', 'max')
        .where('q.room_id = :roomId', { roomId })
        .getRawOne<{ max: number }>();
      let nextPos = (maxPos?.max ?? 0) + 1;

      const added: Track[] = [];
      let pool = [...filtered];

      for (let i = 0; i < toAdd && pool.length > 0; i++) {
        // 추가 직전 재확인
        const freshRoom = await this.roomRepo.findOneBy({ id: roomId });
        if (!freshRoom?.autoDjEnabled) break;

        const pick = this.weightedRandom(pool);
        if (!pick) break;

        // 큐 중복 체크
        const dup = await this.queueRepo.findOneBy({
          room: { id: roomId },
          track: { id: pick.track.id },
          played: false,
        });
        if (dup) {
          pool = pool.filter((c) => c.track.id !== pick.track.id);
          i--;
          continue;
        }

        await this.queueRepo.save(
          this.queueRepo.create({
            room: { id: roomId } as Room,
            track: { id: pick.track.id } as Track,
            addedBy: null,
            isAutoDj: true,
            position: nextPos++,
          }),
        );
        added.push(pick.track);
        this.trackAddedCallback?.(roomId, pick.track);
        pool = pool.filter((c) => c.track.id !== pick.track.id);
      }

      if (added.length) {
        this.failCounts.delete(roomId);
        this.logger.log(
          `[AutoDJ] Added ${added.length} track(s) to room ${roomId}: ${added.map((t) => t.name).join(', ')}`,
        );
        this.batchCompleteCallback?.(roomId, added);
      }
    } catch (e) {
      this.failCounts.set(roomId, (this.failCounts.get(roomId) ?? 0) + 1);
      this.logger.warn(`[AutoDJ] Failed for room ${roomId}`, e instanceof Error ? e.message : e);
    } finally {
      this.processing.delete(roomId);
      this.statusCallback?.(roomId, 'idle');
    }
  }

  /** 연속 실패 카운터 리셋 (곡 전환 시 호출) */
  resetFailCount(roomId: string): void {
    this.failCounts.delete(roomId);
  }

  // ─── 후보 소스 ──────────────────────────────────────────

  private async disableAutoDj(roomId: string, reason: string): Promise<void> {
    await this.roomRepo.update(roomId, { autoDjEnabled: false });
    this.logger.warn(`[AutoDJ] Disabled for room ${roomId}: ${reason}`);
    this.statusCallback?.(roomId, 'disabled', reason);
    this.systemMessageCallback?.(roomId, `🤖 AutoDJ가 비활성화되었습니다: ${reason}`);
  }

  private async getCandidates(roomId: string, mode: AutoDjMode, room: Room): Promise<WeightedCandidate[]> {
    switch (mode) {
      case AutoDjMode.Radio:
        return this.getRadioCandidates(roomId);
      case AutoDjMode.Related:
        return this.getRelatedCandidates(roomId);
      case AutoDjMode.History:
        return this.getHistoryCandidates(roomId);
      case AutoDjMode.Popular:
        return this.getPopularCandidates();
      case AutoDjMode.Mixed:
        return this.getMixedCandidates(roomId);
      case AutoDjMode.Favorites:
        return this.getFavoritesCandidates(room);
      case AutoDjMode.AI:
        return this.getAiCandidates(roomId, room);
    }
  }

  private async getRadioCandidates(roomId: string): Promise<WeightedCandidate[]> {
    const videoId = await this.getCurrentVideoId(roomId);
    if (!videoId) return this.getPopularCandidates();
    try {
      const related = await fetchYtMusicRelated(videoId);
      if (!related.similarArtists.length) return await this.getRelatedCandidates(roomId);
      // 랜덤 3명 선택 → 각 아티스트로 검색
      const picks = related.similarArtists.sort(() => Math.random() - 0.5).slice(0, 3);
      const tracks: Track[] = [];
      for (const artist of picks) {
        const results = await this.ytdlp.search(artist.name, AUTODJ_CANDIDATE_FETCH_LIMIT);
        const upserted = await Promise.all(results.map((r) => this.upsertTrack(r)));
        tracks.push(...upserted);
      }
      // 중복 제거
      const unique = [...new Map(tracks.map((t) => [t.id, t])).values()];
      return unique.map((track) => ({ track, weight: 1.0 }));
    } catch {
      return this.getRelatedCandidates(roomId);
    }
  }

  private async getRelatedCandidates(roomId: string): Promise<WeightedCandidate[]> {
    const videoId = await this.getCurrentVideoId(roomId);
    if (!videoId) return this.getPopularCandidates(); // 폴백
    const related = await this.ytdlp.getRelated(videoId, AUTODJ_CANDIDATE_FETCH_LIMIT);
    const tracks = await Promise.all(related.map((r) => this.upsertTrack(r)));
    return tracks.map((track) => ({ track, weight: 1.0 }));
  }

  private async getHistoryCandidates(roomId: string): Promise<WeightedCandidate[]> {
    const histories = await this.historyRepo.find({
      where: { room: { id: roomId } },
      order: { playedAt: 'DESC' },
      take: AUTODJ_FRESHNESS_HISTORY_DEPTH,
    });
    if (!histories.length) return [];
    const sourceIds = [...new Set(histories.map((h) => h.sourceId))];
    const tracks = await this.trackRepo.find({ where: sourceIds.map((yid) => ({ sourceId: yid })) });
    const trackMap = new Map(tracks.map((t) => [t.sourceId, t]));
    return histories
      .filter((h) => trackMap.has(h.sourceId))
      .map((h) => ({ track: trackMap.get(h.sourceId)!, weight: 1.0 }));
  }

  private async getPopularCandidates(): Promise<WeightedCandidate[]> {
    const stats = await this.statsRepo.find({
      order: { score: 'DESC' },
      take: AUTODJ_CANDIDATE_FETCH_LIMIT,
      relations: ['track'],
    });
    return stats.filter((s) => s.track).map((s) => ({ track: s.track, weight: 1.0 }));
  }

  private async getMixedCandidates(roomId: string): Promise<WeightedCandidate[]> {
    const [related, history, popular] = await Promise.all([
      this.getRelatedCandidates(roomId),
      this.getHistoryCandidates(roomId),
      this.getPopularCandidates(),
    ]);
    // 소스별 가중치
    const weighted = [
      ...related.map((c) => ({ ...c, weight: c.weight * 1.0 })),
      ...history.map((c) => ({ ...c, weight: c.weight * 0.6 })),
      ...popular.map((c) => ({ ...c, weight: c.weight * 0.4 })),
    ];
    // 중복 제거 (같은 trackId → 가장 높은 weight 유지)
    const map = new Map<string, WeightedCandidate>();
    for (const c of weighted) {
      const existing = map.get(c.track.id);
      if (!existing || c.weight > existing.weight) map.set(c.track.id, c);
    }
    return [...map.values()];
  }

  private async getFavoritesCandidates(room: Room): Promise<WeightedCandidate[]> {
    const where: Record<string, unknown> = { userId: room.hostId };
    if (room.autoDjFolderId) where.folderId = room.autoDjFolderId;
    const favs = await this.favoriteRepo.find({ where, relations: ['track'] });
    if (!favs.length) {
      return room.autoDjFavFallbackMixed ? this.getMixedCandidates(room.id) : this.getPopularCandidates();
    }
    return favs.filter((f) => f.track).map((f) => ({ track: f.track, weight: 1.0 }));
  }

  // ─── 신선도 필터 ─────────────────────────────────────────

  private async filterFreshness(candidates: WeightedCandidate[], roomId: string): Promise<WeightedCandidate[]> {
    // 하드 제외: 현재 큐 + 최근 N곡
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

    // 가중치 감쇠: 이력에 있으면 최근일수록 낮은 가중치
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
      deepHistory.map((h, i) => [deepTrackMap.get(h.sourceId)?.id, i]).filter(([id]) => id) as [string, number][],
    );

    // 아티스트 페널티: 직전 큐 + 재생 이력에서 최근 아티스트
    const recentArtists = recentHistory.map((h) => h.artist).filter(Boolean) as string[];

    filtered = filtered.map((c) => {
      let { weight } = c;

      // recency 감쇠
      const idx = historyIndex.get(c.track.id);
      if (idx !== undefined) {
        const recency = 1 - idx / AUTODJ_FRESHNESS_HISTORY_DEPTH;
        weight *= 1 - 0.5 * recency;
      }

      // 아티스트 페널티
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

  // ─── 유틸 ────────────────────────────────────────────────

  private weightedRandom(candidates: WeightedCandidate[]): WeightedCandidate | null {
    if (!candidates.length) return null;
    const total = candidates.reduce((sum, c) => sum + c.weight, 0);
    let r = Math.random() * total;
    for (const c of candidates) {
      r -= c.weight;
      if (r <= 0) return c;
    }
    return candidates[candidates.length - 1];
  }

  private async getCurrentVideoId(roomId: string): Promise<string | null> {
    const playback = await this.playbackRepo.findOne({ where: { roomId }, relations: ['track'] });
    if (playback?.track?.sourceId) return playback.track.sourceId;

    // 폴백: 최근 큐
    const recent = await this.queueRepo.findOne({
      where: { room: { id: roomId } },
      order: { addedAt: 'DESC' },
      relations: ['track'],
    });
    return recent?.track?.sourceId ?? null;
  }

  private async upsertTrack(r: YtdlpSearchResult): Promise<Track> {
    const existing = await this.trackRepo.findOneBy({ sourceId: r.id });
    if (existing) return existing;
    return this.trackRepo.save(
      this.trackRepo.create({
        provider: Provider.YT,
        sourceId: r.id,
        name: r.title,
        artist: r.artist,
        thumbnail: r.thumbnail,
        durationMs: r.duration * 1000,
        fetchedAt: new Date(),
      }),
    );
  }

  // ─── AI Pool ───

  private async getAiCandidates(roomId: string, room: Room): Promise<WeightedCandidate[]> {
    const pool = this.aiPools.get(roomId);
    if (pool && pool.candidates.length > 0) {
      return pool.candidates.map((e) => ({ track: e.track, weight: e.pinned ? 10 : 1 }));
    }
    // 풀 비어있으면 리필 시도, 그 동안 Related 폴백
    this.refreshAiPool(roomId, room).catch((e: unknown) =>
      this.logger.warn(`[AI pool refresh] ${(e as Error).message}`),
    );
    return this.getRelatedCandidates(roomId);
  }

  async refreshAiPool(roomId: string, room?: Room): Promise<void> {
    const existing = this.aiPools.get(roomId);
    if (existing?.refreshing) return;

    const r = room ?? (await this.roomRepo.findOneBy({ id: roomId }));
    if (!r) return;

    const pool: AiPool = existing ?? { candidates: [], refreshing: false, usedSourceIds: new Set() };
    pool.refreshing = true;
    this.aiPools.set(roomId, pool);

    try {
      const apiKey = this.settings.getSecret(OptionKey.GeminiApiKey);
      if (!apiKey) {
        this.logger.warn('[AI DJ] Gemini API key not configured');
        return;
      }

      const batchSize = this.settings.getNumber(OptionKey.AutoDjBatchSize, 15);
      const temperature = parseFloat(this.settings.get(OptionKey.AutoDjTemperature, '0.8'));
      const model = this.settings.get(OptionKey.AutoDjAiModel, 'gemini-2.5-flash-lite');

      // 최근 재생 5곡
      const recentHistory = await this.historyRepo.find({
        where: { room: { id: roomId } },
        order: { playedAt: 'DESC' },
        take: 5,
      });
      const recentTracks = recentHistory.length
        ? await this.trackRepo.find({ where: recentHistory.map((h) => ({ sourceId: h.sourceId })) })
        : [];

      const context = recentTracks.map((t) => `${t.artist ?? 'Unknown'} - ${t.name}`).join('\n');
      const tags = (r.autoDjTags as AutoDjTags | null) ?? { mood: [], genre: [], era: [], country: [] };
      const tagDesc = [
        tags.mood.length ? `분위기: ${tags.mood.join(', ')}` : '',
        tags.genre.length ? `장르: ${tags.genre.join(', ')}` : '',
        tags.era.length ? `시대: ${tags.era.join(', ')}` : '',
        tags.country.length ? `국가: ${tags.country.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('. ');
      const userPrompt = r.autoDjPrompt ?? '';

      const prompt = [
        '당신은 음악 추천 전문가입니다.',
        '아래 조건에 맞는 곡을 YouTube Music에서 찾을 수 있는 공식 음원으로 추천해주세요.',
        '커버, 라이브, 리믹스, instrumental, 강의, 컴필레이션 제외. 1~7분 길이.',
        `${batchSize}곡을 "아티스트 - 제목" 형식으로, 한 줄에 하나씩 출력.`,
        '',
        recentTracks.length ? `최근 재생:\n${context}` : '',
        tagDesc ? `조건: ${tagDesc}` : '',
        userPrompt ? `추가 요청: ${userPrompt}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      // Gemini 호출
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const gemini = genAI.getGenerativeModel({ model, generationConfig: { temperature } });
      const result = await gemini.generateContent(prompt);
      const text = result.response.text();

      // 파싱 — "아티스트 - 제목" 형식
      const lines = text
        .split('\n')
        .map((l) => l.replace(/^\d+[.)]\s*/, '').trim())
        .filter((l) => l.includes(' - ') || l.includes(' – '));

      // 검색 + 필터
      const pinned = pool.candidates.filter((e) => e.pinned);
      const newCandidates: AiPoolEntry[] = [...pinned];
      const titleBlacklist = /live|cover|tutorial|lesson|karaoke|instrumental|remix|compilation/i;

      for (const line of lines) {
        if (newCandidates.length >= batchSize) break;
        try {
          const results = await this.ytdlp.searchInnertube(line);
          const match = results.results.find(
            (r) =>
              r.duration >= 60 && r.duration <= 480 && !titleBlacklist.test(r.title) && !pool.usedSourceIds.has(r.id),
          );
          if (!match) continue;
          const track = await this.upsertTrack(match);
          if (newCandidates.some((c) => c.track.id === track.id)) continue;
          newCandidates.push({ track, pinned: false });
          pool.usedSourceIds.add(match.id);
        } catch {
          // 개별 검색 실패 무시
        }
      }

      pool.candidates = newCandidates;
      this.logger.log(`[AI DJ] Pool refreshed for ${roomId}: ${newCandidates.length} candidates`);
    } finally {
      pool.refreshing = false;
    }
  }

  /** 후보 목록 조회 (API용) */
  getAiPoolCandidates(roomId: string): AiPoolEntry[] {
    return this.aiPools.get(roomId)?.candidates ?? [];
  }

  /** 후보 핀 토글 */
  pinAiCandidate(roomId: string, trackId: string): void {
    const pool = this.aiPools.get(roomId);
    if (!pool) return;
    const entry = pool.candidates.find((c) => c.track.id === trackId);
    if (entry) entry.pinned = !entry.pinned;
  }

  /** 후보 스킵 (제거) */
  skipAiCandidate(roomId: string, trackId: string): void {
    const pool = this.aiPools.get(roomId);
    if (!pool) return;
    pool.candidates = pool.candidates.filter((c) => c.track.id !== trackId);
  }

  /** 풀에서 다음 곡 소비 (큐 투입 시) */
  consumeFromAiPool(roomId: string): Track | null {
    const pool = this.aiPools.get(roomId);
    if (!pool || !pool.candidates.length) return null;
    // 핀된 곡 우선
    const pinnedIdx = pool.candidates.findIndex((c) => c.pinned);
    const idx = pinnedIdx >= 0 ? pinnedIdx : 0;
    const [entry] = pool.candidates.splice(idx, 1);
    return entry.track;
  }
}
