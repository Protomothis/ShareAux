import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { execFile } from 'child_process';
import { readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { Repository } from 'typeorm';

import { Track } from '../entities/track.entity.js';
import type { LyricsResult } from '../types/index.js';

const execFileAsync = promisify(execFile);

interface Json3Event {
  tStartMs: number;
  dDurationMs?: number;
  aAppend?: number;
  segs?: { utf8: string }[];
}

@Injectable()
export class LyricsService {
  private readonly logger = new Logger(LyricsService.name);
  private readonly ytdlpPath: string;

  constructor(
    config: ConfigService,
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
  ) {
    this.ytdlpPath = config.get<string>('YTDLP_PATH', 'yt-dlp');
  }

  private smartClean(title: string): string {
    const quoted = /['"]([^'"]+)['"]/.exec(title)?.[1];
    const noBracket = title.replace(/[([{].*?[)\]}]/g, '');
    const noNoise = noBracket.replace(
      /official|mv|performance|ver\.\d+|가사|lyrics?|color\s*coded|dance\s*practice|live|stage|\[|\]|_|-|'/gi,
      '',
    );
    const artist = noNoise.replace(/\s+/g, ' ').trim().split("'")[0].trim();
    return quoted ? `${artist} ${quoted}`.trim() : artist;
  }

  private extractTitle(name: string): string {
    const quoted = /['"]([^'"]+)['"]/.exec(name)?.[1];
    if (quoted) return quoted;
    const dash = name.split(/\s*[-–—]\s*/);
    if (dash.length >= 2) {
      return dash
        .slice(1)
        .join(' ')
        .replace(/[([{].*?[)\]}]/g, '')
        .trim();
    }
    return name
      .replace(/[([{].*?[)\]}]/g, '')
      .replace(/official|mv|m\/v|music\s*video/gi, '')
      .trim();
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
        return { syncedLyrics: existing.lyricsData, enhanced: false };
      }
      if (existing?.lyricsStatus === 'not_found') return null;
    }

    const result = await this.searchLyrics(trackName, duration, artist, sourceId, songTitle, songArtist);

    // DB에 저장
    if (trackId) {
      await this.trackRepo.update(trackId, {
        lyricsStatus: result?.syncedLyrics ? 'found' : 'not_found',
        lyricsData: result?.syncedLyrics ?? null,
      });
    }

    return result;
  }

  /** 실제 가사 검색 로직 */
  private async searchLyrics(
    trackName: string,
    duration?: number,
    artist?: string,
    sourceId?: string,
    songTitle?: string | null,
    songArtist?: string | null,
  ): Promise<LyricsResult | null> {
    // 1순위: KLRC (enhanced/karaoke) — Musixmatch에서만 제공
    const klrcQueries: string[] = [];
    if (songTitle && songArtist) klrcQueries.push(`${songArtist} ${songTitle}`);
    if (artist) klrcQueries.push(`${artist} ${this.extractTitle(trackName)}`);
    klrcQueries.push(this.smartClean(trackName));
    for (const q of [...new Set(klrcQueries.filter((s) => s.length > 2))]) {
      const enhanced = await this.runSyncedlyrics(q, true);
      if (enhanced) {
        const result = { syncedLyrics: enhanced, enhanced: true };

        this.logger.log(`KLRC found for "${q}"`);
        return result;
      }
    }

    // 2순위: YouTube 공식 자막 (LRC)
    if (sourceId) {
      const ytLyrics = await this.getYouTubeSubtitles(sourceId);
      if (ytLyrics) {
        this.logger.log(`YouTube subtitles found for ${sourceId}`);

        return ytLyrics;
      }
    }

    // 3순위: Content ID 기반 LRC
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
    const title = this.extractTitle(trackName);
    const cleanedFull = this.smartClean(trackName);

    const queries: string[] = [];
    if (artist) {
      const cleanArtist = artist
        .replace(/\s*(VEVO|Official|Records|Music|Entertainment|Labels|HYBE|SM\s*TOWN|YG|JYP)\s*/gi, '')
        .trim();
      queries.push(`${cleanArtist} ${title}`);
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

  private async getYouTubeSubtitles(videoId: string): Promise<LyricsResult | null> {
    const outPath = join(tmpdir(), `shareaux-sub-${videoId}`);
    try {
      // ko → en → ja 순서로 시도
      await execFileAsync(
        this.ytdlpPath,
        [
          '--write-auto-sub',
          '--sub-lang',
          'ko,en,ja',
          '--sub-format',
          'json3',
          '--skip-download',
          '--no-warnings',
          '-o',
          outPath,
          `https://www.youtube.com/watch?v=${videoId}`,
        ],
        { timeout: 15_000 },
      );

      // 다운로드된 파일 찾기 (ko → en → ja 우선)
      for (const lang of ['ko', 'en', 'ja']) {
        const filePath = `${outPath}.${lang}.json3`;
        try {
          const raw = await readFile(filePath, 'utf-8');
          const lrc = this.json3ToLrc(raw);
          if (lrc) return { syncedLyrics: lrc };
        } catch {
          // 해당 언어 파일 없음
        } finally {
          rm(filePath, { force: true }).catch(() => {});
        }
      }
      return null;
    } catch (e) {
      this.logger.warn(`YouTube subtitle fetch failed for ${videoId}`, e instanceof Error ? e.message : e);
      return null;
    }
  }

  private json3ToLrc(raw: string): string | null {
    const data = JSON.parse(raw) as { events?: Json3Event[] };
    if (!data.events?.length) return null;

    const lines: string[] = [];
    for (const ev of data.events) {
      // aAppend는 이전 줄에 이어붙이는 이벤트 — 스킵
      if (ev.aAppend || !ev.segs) continue;
      const text = ev.segs
        .map((s) => s.utf8)
        .join('')
        .trim();
      // 빈 줄, 뮤직 마커 필터
      if (!text || /^\[.*]$/.test(text)) continue;

      const ms = ev.tStartMs;
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      const cs = Math.floor((ms % 1000) / 10);
      lines.push(
        `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}] ${text}`,
      );
    }

    return lines.length >= 3 ? lines.join('\n') : null;
  }

  private async trySearch(query: string): Promise<LyricsResult | null> {
    // LRC만 시도 (KLRC는 getLyrics 1순위에서 이미 시도)
    const synced = await this.runSyncedlyrics(query, false);
    if (synced) return { syncedLyrics: synced };
    return null;
  }

  private async runSyncedlyrics(query: string, enhanced: boolean): Promise<string | null> {
    const q = JSON.stringify(query);
    const opts = enhanced
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
      this.logger.warn(`syncedlyrics fetch failed (enhanced=${enhanced})`, e instanceof Error ? e.message : e);
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
      const matched = results.find((r) => r.duration && Math.abs(r.duration - duration) < 5 && r.syncedLyrics);
      if (matched?.syncedLyrics) return { syncedLyrics: matched.syncedLyrics };
      const best = results[0];
      return best.syncedLyrics ? { syncedLyrics: best.syncedLyrics } : null;
    } catch (e) {
      this.logger.warn('LRCLIB API failed', e instanceof Error ? e.message : e);
      return null;
    }
  }
}
