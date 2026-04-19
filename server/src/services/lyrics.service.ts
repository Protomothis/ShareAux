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
import { LyricsType } from '../types/lyrics-type.enum.js';
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

  /** 노이즈 제거용 정규식 */
  private static readonly NOISE_RE = new RegExp(
    [
      // 영어 노이즈
      'official\\s*(music\\s*)?video',
      'official\\s*audio',
      'official\\s*lyric\\s*video',
      'official\\s*visualizer',
      'official\\s*mv',
      'music\\s*video',
      'lyric\\s*video',
      'm\\/?v',
      'lyrics?',
      'audio',
      'video',
      'visualizer',
      'performance\\s*video',
      'dance\\s*practice',
      'color\\s*coded',
      'original\\s*mix',
      'full\\s*ver\\.?',
      'short\\s*ver\\.?',
      'ver\\.\\d+',
      'remaster(ed)?',
      'hd|hq|4k|1080p',
      'live',
      'stage',
      'teaser',
      'preview',
      'track\\s*\\d+',
      // 한국어 노이즈
      '가사',
      '공식',
      '뮤직비디오',
      '자막',
      // 일본어 노이즈
      '歌ってみた',
      'MV',
    ].join('|'),
    'gi',
  );

  /** 괄호류 정규식 (CJK 포함) */
  private static readonly BRACKET_RE = /[【\[（(「『《][^】\]）)」』》]*[】\]）)」』》]/g;

  private smartClean(title: string): string {
    const quoted = /['"]([^'"]+)['"]/.exec(title)?.[1];
    const noBracket = title
      .replace(LyricsService.BRACKET_RE, '')
      .replace(/\s*\/\s*THE FIRST TAKE.*/i, '')
      .replace(/\s*\/\s*/g, ' ');
    const noNoise = noBracket.replace(LyricsService.NOISE_RE, '');
    // feat./ft. 이후 제거
    const noFeat = noNoise.replace(/\s*(feat\.?|ft\.?)\s*.*/i, '');
    const cleaned = noFeat.replace(/\s+/g, ' ').trim();
    return quoted ? `${cleaned} ${quoted}`.trim() : cleaned;
  }

  private extractTitle(name: string): string {
    const quoted = /['"]([^'"]+)['"]/.exec(name)?.[1];
    if (quoted) return quoted;
    const noBracket = name.replace(LyricsService.BRACKET_RE, '');
    // 구분자: - – — | ~
    const parts = noBracket.split(/\s*[-–—|~]\s*/);
    const raw = parts.length >= 2 ? parts.slice(1).join(' ') : noBracket;
    return raw
      .replace(/\s*\/\s*THE FIRST TAKE.*/i, '')
      .replace(/\s*\/\s*/g, ' ')
      .replace(LyricsService.NOISE_RE, '')
      .replace(/\s*(feat\.?|ft\.?)\s*.*/i, '')
      .replace(/\s+/g, ' ')
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
        return { syncedLyrics: existing.lyricsData, lyricsType: existing.lyricsType ?? LyricsType.SYNCED };
      }
      if (existing?.lyricsStatus === 'not_found') {
        // 24시간 후 재시도 허용
        const age = Date.now() - new Date(existing.fetchedAt).getTime();
        if (age < 24 * 60 * 60_000) return null;
      }
    }

    const result = await this.searchLyrics(trackName, duration, artist, sourceId, songTitle, songArtist);

    // DB에 저장
    if (trackId) {
      await this.trackRepo.update(trackId, {
        lyricsStatus: result?.syncedLyrics ? 'found' : 'not_found',
        lyricsData: result?.syncedLyrics ?? null,
        lyricsType: result?.lyricsType ?? null,
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
    // 1순위: KLRC (karaoke) — Musixmatch에서만 제공
    const klrcQueries: string[] = [];
    if (songTitle && songArtist) klrcQueries.push(`${songArtist} ${songTitle}`);
    if (artist) klrcQueries.push(`${artist} ${this.extractTitle(trackName)}`);
    klrcQueries.push(this.smartClean(trackName));
    for (const q of [...new Set(klrcQueries.filter((s) => s.length > 2))]) {
      const klrc = await this.runSyncedlyrics(q, true);
      if (klrc) {
        this.logger.log(`KLRC found for "${q}"`);
        return { syncedLyrics: klrc, lyricsType: LyricsType.KARAOKE };
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

    // 3순위: Content ID 기반 LRC (innertube 메타에서 추출한 곡명/아티스트)
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

    // 4순위: LRCLIB + syncedlyrics (YouTube 제목 기반)
    const title = this.extractTitle(trackName);
    const cleanedFull = this.smartClean(trackName);

    const queries: string[] = [];
    if (artist) {
      const cleanArtist = artist
        .replace(
          /\s*(Stone\s*Music\s*Entertainment|HYBE\s*LABELS|SM\s*TOWN|JYP\s*Entertainment|YG\s*Entertainment|Warner\s*Music|Universal\s*Music|Sony\s*Music|Capitol\s*Records)\s*/gi,
          '',
        )
        .replace(/\s*(VEVO|Official|Records|Music|Entertainment|Labels|Channel|Topic)\s*/gi, '')
        .replace(/\s*\/\s*.*/, '') // 슬래시 뒤 제거 (なとり / natori → なとり)
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
          if (lrc) return { syncedLyrics: lrc, lyricsType: LyricsType.SYNCED };
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
      const matched = results.find((r) => r.duration && Math.abs(r.duration - duration) < 5 && r.syncedLyrics);
      if (matched?.syncedLyrics) return { syncedLyrics: matched.syncedLyrics, lyricsType: LyricsType.SYNCED };
      return null;
    } catch (e) {
      this.logger.warn('LRCLIB API failed', e instanceof Error ? e.message : e);
      return null;
    }
  }
}
