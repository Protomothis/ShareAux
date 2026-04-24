import { Provider } from '../types/provider.enum.js';
import { MetaStatus } from '../types/meta-status.enum.js';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SHOWCASE_CACHE_TTL_MS } from '../constants.js';
import { RoomPlayback } from '../entities/room-playback.entity.js';
import { Track } from '../entities/track.entity.js';
import { TrackStats } from '../entities/track-stats.entity.js';
import { UserTrackHistory } from '../entities/user-track-history.entity.js';
import { type YtdlpSearchResult, YtdlpService } from '../services/ytdlp.service.js';
import { fetchMusicCredits } from '../services/innertube-parser.js';
import { MusicBrainzService } from '../services/musicbrainz.service.js';
import { cleanArtist, extractTitle } from '../services/title-cleaner.js';
import type { SearchResultItem } from './dto/search-result-item.dto.js';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly playlistCache = new Map<string, { tracks: SearchResultItem[]; fetchedAt: number }>();

  constructor(
    private readonly ytdlp: YtdlpService,
    private readonly musicBrainz: MusicBrainzService,
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    @InjectRepository(RoomPlayback) private readonly playbackRepo: Repository<RoomPlayback>,
    @InjectRepository(TrackStats) private readonly statsRepo: Repository<TrackStats>,
    @InjectRepository(UserTrackHistory) private readonly userHistoryRepo: Repository<UserTrackHistory>,
  ) {}

  async suggest(q: string): Promise<{ suggestions: string[] }> {
    try {
      const url = `https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const text = await res.text();
      const json = JSON.parse(text.slice(text.indexOf('(') + 1, -1)) as [string, string[][]];
      return { suggestions: json[1].map((s) => s[0]) };
    } catch (e) {
      this.logger.warn('Suggest failed', e instanceof Error ? e.message : e);
      return { suggestions: [] };
    }
  }

  async searchWithContinuation(query: string, continuation?: string) {
    if (continuation) {
      const { results, continuation: nextToken } = await this.ytdlp.searchInnertube(query, continuation);
      const tracks = results.map((r) => this.toSearchResult(r));
      return { tracks, playlists: [], continuation: nextToken };
    }

    const [videoResult, playlistResults] = await Promise.all([
      this.ytdlp.searchInnertube(query),
      this.ytdlp.searchPlaylists(query),
    ]);

    const tracks = videoResult.results.map((r) => this.toSearchResult(r));
    return { tracks, playlists: playlistResults, continuation: videoResult.continuation };
  }

  async getPlaylistTracks(playlistId: string, page: number, limit: number) {
    const cached = this.playlistCache.get(playlistId);
    let allTracks: SearchResultItem[];

    if (cached && Date.now() - cached.fetchedAt < SHOWCASE_CACHE_TTL_MS) {
      allTracks = cached.tracks;
    } else {
      const results = await this.ytdlp.getPlaylistTracks(playlistId);
      allTracks = results.map((r) => this.toSearchResult(r));
      this.playlistCache.set(playlistId, { tracks: allTracks, fetchedAt: Date.now() });
    }

    const start = (page - 1) * limit;
    return {
      tracks: allTracks.slice(start, start + limit),
      total: allTracks.length,
      page,
      limit,
    };
  }

  async search(query: string, limit = 10): Promise<SearchResultItem[]> {
    const results = await this.ytdlp.search(query, limit);
    return results.map((r) => this.toSearchResult(r));
  }

  async getShowcase(roomId: string, userId: string) {
    const [popular, recent, myHistory] = await Promise.all([
      this.getPopularTracks(),
      this.getRecentTracks(),
      this.getMyTracks(userId),
    ]);
    return { popular, recent, myHistory };
  }

  async getRecommendedTracks(roomId: string) {
    const recommended = await this.getRecommended(roomId);
    return { recommended };
  }

  private async getPopularTracks(limit = 10): Promise<Track[]> {
    const stats = await this.statsRepo.find({
      order: { score: 'DESC' },
      take: limit,
      relations: ['track'],
    });
    return stats.map((s) => s.track).filter(Boolean);
  }

  private async getRecentTracks(limit = 10): Promise<Track[]> {
    const stats = await this.statsRepo.find({
      order: { lastPlayedAt: 'DESC' },
      take: limit,
      relations: ['track'],
    });
    return stats.map((s) => s.track).filter(Boolean);
  }

  private async getMyTracks(userId: string, limit = 10): Promise<Track[]> {
    const histories = await this.userHistoryRepo.find({
      where: { userId },
      order: { lastPlayedAt: 'DESC' },
      take: limit,
      relations: ['track'],
    });
    return histories.map((h) => h.track).filter(Boolean);
  }

  private async getRecommended(roomId: string, limit = 10): Promise<SearchResultItem[]> {
    try {
      // 1. 현재 재생 중인 곡
      const playback = await this.playbackRepo.findOne({ where: { roomId }, relations: ['track'] });
      let videoId = playback?.track?.sourceId;
      // 2. 이 방의 최근 큐 기록
      if (!videoId) {
        const recent = await this.trackRepo
          .createQueryBuilder('t')
          .innerJoin('room_queues', 'q', 'q.track_id = t.id')
          .where('q.room_id = :roomId', { roomId })
          .orderBy('q.added_at', 'DESC')
          .getOne();
        videoId = recent?.sourceId;
      }
      // 3. 글로벌 최근 재생
      if (!videoId) {
        const [top] = await this.statsRepo.find({ order: { lastPlayedAt: 'DESC' }, take: 1, relations: ['track'] });
        videoId = top?.track?.sourceId;
      }
      if (!videoId) return [];
      // 넉넉히 가져와서 셔플 → 매번 다른 추천
      const related = await this.ytdlp.getRelated(videoId, limit * 3);
      const shuffled = related.sort(() => Math.random() - 0.5).slice(0, limit);
      return shuffled.map((r) => this.toSearchResult(r));
    } catch (e) {
      this.logger.warn('getRecommended failed', e instanceof Error ? e.message : e);
      return [];
    }
  }

  private toSearchResult(r: YtdlpSearchResult): SearchResultItem {
    return {
      provider: Provider.YT,
      sourceId: r.id,
      name: r.title,
      artist: r.artist,
      thumbnail: r.thumbnail,
      durationMs: r.duration * 1000,
      isOfficial: r.isOfficial,
      views: r.views,
    };
  }

  /** DB upsert — 큐 추가 시에만 호출 */
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

  /** 큐 추가 시 Content ID 메타데이터 fetch + DB 업데이트 */
  async enrichTrackCredits(trackId: string, sourceId: string): Promise<void> {
    this.logger.log(`[enrich] fetching credits for ${sourceId}`);
    const credits = await fetchMusicCredits(sourceId).catch((e: unknown) => {
      this.logger.warn(`[enrich] fetchMusicCredits error for ${sourceId}: ${e instanceof Error ? e.message : e}`);
      return null;
    });
    const update: Partial<Track> = {};
    if (credits?.songTitle) {
      update.metaStatus = MetaStatus.Matched;
      update.songTitle = credits.songTitle;
      update.songArtist = credits.songArtist;
      update.songAlbum = credits.songAlbum;
      this.logger.log(`[enrich] ${sourceId} → "${credits.songTitle}" by ${credits.songArtist}`);
    } else {
      // Content ID 없으면 MusicBrainz 폴백
      const track = await this.trackRepo.findOneBy({ id: trackId });
      if (track) {
        const artist = cleanArtist(track.artist ?? '');
        const title = extractTitle(track.name);
        const dur = track.durationMs ?? undefined;
        // 1차: artist + title, 2차: title only
        let mb = await this.musicBrainz.search(artist, title, dur);
        if (!mb && artist) {
          mb = await this.musicBrainz.search('', title, dur);
        }
        if (mb) {
          update.metaStatus = MetaStatus.Matched;
          update.songTitle = mb.title;
          update.songArtist = mb.artist;
          update.songAlbum = mb.album ?? null;
          this.logger.log(`[enrich] ${sourceId} → MusicBrainz: "${mb.title}" by ${mb.artist}`);
        } else {
          update.metaStatus = MetaStatus.NotFound;
          this.logger.log(`[enrich] ${sourceId} → no credits found`);
        }
      }
    }
    await this.trackRepo.update(trackId, update);
  }
}
