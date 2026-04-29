import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { Repository } from 'typeorm';

import { Track } from '../entities/track.entity.js';
import { LyricsType } from '../types/lyrics-type.enum.js';
import type { LyricsResult } from '../types/index.js';

const execFileAsync = promisify(execFile);

import { cleanArtist, extractTitle, smartClean } from './title-cleaner.js';
import { detectLang } from './detect-lang.js';

@Injectable()
export class LyricsService {
  private readonly logger = new Logger(LyricsService.name);
  private readonly ytdlpPath: string;
  private readonly MAX_CONCURRENT = 3;
  private running = 0;
  private waitQueue: (() => void)[] = [];

  private async acquireSlot(): Promise<void> {
    if (this.running < this.MAX_CONCURRENT) {
      this.running++;
      return;
    }
    await new Promise<void>((resolve) => this.waitQueue.push(resolve));
    this.running++;
  }

  private releaseSlot(): void {
    this.running--;
    this.waitQueue.shift()?.();
  }

  constructor(
    config: ConfigService,
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
  ) {
    this.ytdlpPath = config.get<string>('YTDLP_PATH', 'yt-dlp');
  }

  async getLyrics(
    trackName: string,
    duration?: number,
    artist?: string,
    sourceId?: string,
    songTitle?: string | null,
    songArtist?: string | null,
    trackId?: string,
  ) {
    // DB에 이미 있으면 바로 리턴
    if (trackId) {
      const existing = await this.trackRepo
        .createQueryBuilder('t')
        .addSelect('t.lyrics_data', 't_lyrics_data')
        .where('t.id = :trackId', { trackId })
        .getOne();
      if (existing?.lyricsStatus === 'found' && existing.lyricsData) {
        return {
          syncedLyrics: existing.lyricsData,
          lyricsType: existing.lyricsType ?? LyricsType.SYNCED,
          lang: existing.lyricsLang,
        };
      }
      if (existing?.lyricsStatus === 'not_found') {
        // 24시간 후 재시도 허용
        const age = Date.now() - new Date(existing.fetchedAt).getTime();
        if (age < 24 * 60 * 60_000) return null;
      }
    }

    await this.acquireSlot();
    let result: LyricsResult | null;
    try {
      result = await this.searchLyrics(trackName, duration, artist, songTitle, songArtist);
    } finally {
      this.releaseSlot();
    }

    // DB에 저장
    if (trackId) {
      await this.trackRepo.update(trackId, {
        lyricsStatus: result?.syncedLyrics ? 'found' : 'not_found',
        lyricsData: result?.syncedLyrics ?? null,
        lyricsType: result?.lyricsType ?? null,
        lyricsLang: result?.syncedLyrics ? detectLang(result.syncedLyrics) : null,
      });
      if (result) result.lang = detectLang(result.syncedLyrics ?? '') ?? null;
    }

    return result;
  }

  /** 실제 가사 검색 로직 */
  private async searchLyrics(
    trackName: string,
    duration?: number,
    artist?: string,
    songTitle?: string | null,
    songArtist?: string | null,
  ): Promise<LyricsResult | null> {
    // 1순위: KLRC (karaoke) — Musixmatch에서만 제공
    const klrcQueries: string[] = [];
    if (songTitle && songArtist) klrcQueries.push(`${songArtist} ${songTitle}`);
    if (artist) klrcQueries.push(`${artist} ${extractTitle(trackName)}`);
    klrcQueries.push(smartClean(trackName));
    for (const q of [...new Set(klrcQueries.filter((s) => s.length > 2))]) {
      const klrc = await this.runSyncedlyrics(q, true);
      if (klrc) {
        this.logger.log(`KLRC found for "${q}"`);
        return { syncedLyrics: klrc, lyricsType: LyricsType.KARAOKE };
      }
    }

    // 2순위: Content ID 기반 LRC (innertube 메타에서 추출한 곡명/아티스트)
    if (songTitle && songArtist) {
      const creditQuery = `${songArtist} ${songTitle}`;
      this.logger.log(`Lyrics search (Content ID): "${creditQuery}"`);
      if (duration) {
        const lrclib = await this.tryLrclibWithDuration(creditQuery, duration);
        if (lrclib) return lrclib;
      }
      const result = await this.trySearch(creditQuery);
      if (result) return result;
    }

    // 3순위: LRCLIB + syncedlyrics (YouTube 제목 기반)
    const title = extractTitle(trackName);
    const cleanedFull = smartClean(trackName);

    const queries: string[] = [];
    if (artist) {
      const cleaned = cleanArtist(artist);
      if (cleaned) queries.push(`${cleaned} ${title}`);
    }
    queries.push(cleanedFull, trackName);
    const unique = [...new Set(queries.filter((q) => q.length > 2))];

    for (const q of unique) {
      this.logger.log(`Lyrics search: "${q}"`);
      if (duration) {
        const lrclib = await this.tryLrclibWithDuration(q, duration);
        if (lrclib) {
          return lrclib;
        }
      }
      const result = await this.trySearch(q);
      if (result) {
        return result;
      }
    }

    return null;
  }

  private async trySearch(query: string): Promise<LyricsResult | null> {
    // LRC만 시도 (KLRC는 getLyrics 1순위에서 이미 시도)
    const synced = await this.runSyncedlyrics(query, false);
    if (synced) return { syncedLyrics: synced, lyricsType: LyricsType.SYNCED };
    return null;
  }

  private async runSyncedlyrics(query: string, karaoke: boolean): Promise<string | null> {
    const q = JSON.stringify(query);
    const opts = karaoke
      ? `enhanced=True, synced_only=True, providers=["Musixmatch"]`
      : `synced_only=True, providers=["Musixmatch", "NetEase", "Lrclib"]`;
    try {
      const { stdout } = await execFileAsync(
        'python3',
        ['-c', `import syncedlyrics; r=syncedlyrics.search(${q}, ${opts}); print(r or '')`],
        { timeout: 10_000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
      );
      const lrc = stdout.trim();
      return lrc || null;
    } catch (e) {
      this.logger.warn(`syncedlyrics fetch failed (karaoke=${karaoke})`, e instanceof Error ? e.message : e);
      return null;
    }
  }

  private async tryLrclibWithDuration(query: string, duration: number): Promise<LyricsResult | null> {
    try {
      const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return null;
      const results = (await res.json()) as {
        syncedLyrics?: string;
        duration?: number;
      }[];
      if (!results.length) return null;
      const matched = results.find((r) => r.duration && Math.abs(r.duration - duration) < 10 && r.syncedLyrics);
      if (matched?.syncedLyrics) return { syncedLyrics: matched.syncedLyrics, lyricsType: LyricsType.SYNCED };
      return null;
    } catch (e) {
      this.logger.warn('LRCLIB API failed', e instanceof Error ? e.message : e);
      return null;
    }
  }
}
