import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AUTODJ_CANDIDATE_FETCH_LIMIT, AUTODJ_FRESHNESS_HISTORY_DEPTH, AUTODJ_MIN_DURATION_SEC } from '../constants.js';
import { PlayHistory } from '../entities/play-history.entity.js';
import { Room } from '../entities/room.entity.js';
import { RoomPlayback } from '../entities/room-playback.entity.js';
import { RoomQueue } from '../entities/room-queue.entity.js';
import { Track } from '../entities/track.entity.js';
import { TrackStats } from '../entities/track-stats.entity.js';
import { UserFavorite } from '../entities/user-favorite.entity.js';
import { Provider } from '../types/provider.enum.js';
import { fetchYtMusicRelated } from './innertube-parser.js';
import { AiDjGeminiService } from './ai-dj-gemini.service.js';
import { ChartService } from './chart.service.js';
import { type YtdlpSearchResult, YtdlpService } from './ytdlp.service.js';

export interface WeightedCandidate {
  track: Track;
  weight: number;
}

export interface PoolEntry {
  track: Track;
  pinned: boolean;
}

export interface CandidatePool {
  candidates: PoolEntry[];
  refreshing: boolean;
  usedSourceIds: Set<string>;
  /** 풀 생성 시 기준이 된 현재 곡 sourceId (related/radio 갱신 판단용) */
  basedOnSourceId: string | null;
}

@Injectable()
export class AutoDjCandidateService {
  constructor(
    @InjectRepository(RoomQueue) private readonly queueRepo: Repository<RoomQueue>,
    @InjectRepository(RoomPlayback) private readonly playbackRepo: Repository<RoomPlayback>,
    @InjectRepository(PlayHistory) private readonly historyRepo: Repository<PlayHistory>,
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    @InjectRepository(TrackStats) private readonly statsRepo: Repository<TrackStats>,
    @InjectRepository(UserFavorite) private readonly favoriteRepo: Repository<UserFavorite>,
    private readonly ytdlp: YtdlpService,
    private readonly aiGemini: AiDjGeminiService,
    private readonly chartService: ChartService,
  ) {}

  async getRadioCandidates(roomId: string): Promise<WeightedCandidate[]> {
    const videoId = await this.getCurrentVideoId(roomId);
    if (!videoId) return this.getPopularCandidates();
    try {
      const related = await fetchYtMusicRelated(videoId);
      if (!related.similarArtists.length) return await this.getRelatedCandidates(roomId);
      const picks = related.similarArtists.sort(() => Math.random() - 0.5).slice(0, 3);
      const tracks: Track[] = [];
      for (const artist of picks) {
        const results = await this.ytdlp.search(artist.name, AUTODJ_CANDIDATE_FETCH_LIMIT);
        const upserted = await Promise.all(results.map((r) => this.upsertTrack(r)));
        tracks.push(...upserted);
      }
      const unique = [...new Map(tracks.map((t) => [t.id, t])).values()];
      return unique.map((track) => ({ track, weight: 1.0 }));
    } catch {
      return this.getRelatedCandidates(roomId);
    }
  }

  async getRelatedCandidates(roomId: string): Promise<WeightedCandidate[]> {
    const videoId = await this.getCurrentVideoId(roomId);
    if (!videoId) return this.getPopularCandidates();
    const related = await this.ytdlp.getRelated(videoId, AUTODJ_CANDIDATE_FETCH_LIMIT);
    const tracks = await Promise.all(related.map((r) => this.upsertTrack(r)));
    return tracks.map((track) => ({ track, weight: 1.0 }));
  }

  async getHistoryCandidates(roomId: string): Promise<WeightedCandidate[]> {
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

  async getPopularCandidates(): Promise<WeightedCandidate[]> {
    const stats = await this.statsRepo.find({
      order: { score: 'DESC' },
      take: AUTODJ_CANDIDATE_FETCH_LIMIT,
      relations: ['track'],
    });
    return stats.filter((s) => s.track).map((s) => ({ track: s.track, weight: 1.0 }));
  }

  async getMixedCandidates(roomId: string): Promise<WeightedCandidate[]> {
    const [related, history, popular] = await Promise.all([
      this.getRelatedCandidates(roomId),
      this.getHistoryCandidates(roomId),
      this.getPopularCandidates(),
    ]);
    const weighted = [
      ...related.map((c) => ({ ...c, weight: c.weight * 1.0 })),
      ...history.map((c) => ({ ...c, weight: c.weight * 0.6 })),
      ...popular.map((c) => ({ ...c, weight: c.weight * 0.4 })),
    ];
    const map = new Map<string, WeightedCandidate>();
    for (const c of weighted) {
      const existing = map.get(c.track.id);
      if (!existing || c.weight > existing.weight) map.set(c.track.id, c);
    }
    return [...map.values()];
  }

  async getFavoritesCandidates(room: Room): Promise<WeightedCandidate[]> {
    const where: Record<string, unknown> = { userId: room.hostId };
    if (room.autoDjFolderId) where.folderId = room.autoDjFolderId;
    const favs = await this.favoriteRepo.find({ where, relations: ['track'] });
    if (!favs.length) {
      return room.autoDjFavFallbackMixed ? this.getMixedCandidates(room.id) : this.getPopularCandidates();
    }
    return favs.filter((f) => f.track).map((f) => ({ track: f.track, weight: 1.0 }));
  }

  async getChartCandidates(room: Room): Promise<WeightedCandidate[]> {
    const tags = room.autoDjTags ?? { mood: [], genre: [], era: [], country: [] };
    const genres = tags.genre.length ? tags.genre : ['kpop', 'pop'];
    const chartTracks = await this.chartService.getByGenres(genres, AUTODJ_CANDIDATE_FETCH_LIMIT);
    if (!chartTracks.length) return this.getPopularCandidates();

    const tracks: Track[] = [];
    for (const ct of chartTracks) {
      const track = await this.upsertTrack({
        id: ct.sourceId,
        title: ct.title,
        artist: ct.artist,
        thumbnail: ct.thumbnail,
        duration: AUTODJ_MIN_DURATION_SEC,
      });
      tracks.push(track);
    }

    return tracks.map((track, idx) => ({ track, weight: 1.0 - idx * 0.01 }));
  }

  async getAiCandidates(roomId: string, room: Room, pool: CandidatePool): Promise<WeightedCandidate[]> {
    if (pool.candidates.length > 0) {
      return pool.candidates.map((e) => ({ track: e.track, weight: e.pinned ? 10 : 1 }));
    }
    return [];
  }

  async refreshAiPoolInternal(roomId: string, r: Room, pool: CandidatePool, batchSize: number): Promise<void> {
    const pinned = pool.candidates.filter((e) => e.pinned);
    const result = await this.aiGemini.generate(roomId, r, batchSize, pool.usedSourceIds);
    const newCandidates: PoolEntry[] = [...pinned];
    for (const track of result.tracks) {
      if (newCandidates.length >= batchSize) break;
      if (newCandidates.some((c) => c.track.id === track.id)) continue;
      newCandidates.push({ track, pinned: false });
    }
    for (const id of result.usedSourceIds) pool.usedSourceIds.add(id);
    pool.candidates = newCandidates;
  }

  // ─── 유틸 ────────────────────────────────────────────────

  async getCurrentVideoId(roomId: string): Promise<string | null> {
    const playback = await this.playbackRepo.findOne({ where: { roomId }, relations: ['track'] });
    if (playback?.track?.sourceId) return playback.track.sourceId;

    const recent = await this.queueRepo.findOne({
      where: { room: { id: roomId } },
      order: { addedAt: 'DESC' },
      relations: ['track'],
    });
    return recent?.track?.sourceId ?? null;
  }

  async upsertTrack(r: YtdlpSearchResult): Promise<Track> {
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
}
