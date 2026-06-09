import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';

import {
  TRACK_MAX_DURATION_SEC,
  TRACK_MIN_DURATION_SEC,
  YTDLP_FORMAT,
  YTDLP_PLAYLIST_MAX_BUFFER,
  YTDLP_PLAYLIST_TIMEOUT_MS,
  YTDLP_TIMEOUT_MS,
} from '../constants.js';
import { AppException } from '../exceptions/app.exception.js';
import { ErrorCode } from '../types/error-code.enum.js';
import type { AudioInfo } from '../types/index.js';
import type { YtdlpPlaylistEntry, YtdlpVideoMeta } from '../types/ytdlp.types.js';
import * as innertube from './innertube-parser.js';

const execFileAsync = promisify(execFile);

export interface YtdlpSearchResult {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  isOfficial?: boolean;
  views?: number;
}

export interface YtdlpPlaylistResult {
  playlistId: string;
  title: string;
  thumbnail: string;
  videoCount: number;
  channelName: string;
}

export interface YtdlpPlaylistTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  available: boolean;
}

export interface InnertubeSearchResponse {
  results: YtdlpSearchResult[];
  playlists: YtdlpPlaylistResult[];
  continuation?: string;
}

@Injectable()
export class YtdlpService {
  private readonly logger = new Logger(YtdlpService.name);
  private readonly ytdlpPath: string;

  constructor(config: ConfigService) {
    this.ytdlpPath = config.get<string>('YTDLP_PATH', 'yt-dlp');
  }

  async searchInnertube(query: string, continuation?: string): Promise<InnertubeSearchResponse> {
    try {
      const { results, playlists, continuation: next } = await innertube.searchVideos(query, continuation);
      return { results: this.sortResults(results), playlists, continuation: next };
    } catch (e) {
      this.logger.warn('Innertube search failed', e instanceof Error ? e.message : e);
      return { results: [], playlists: [] };
    }
  }

  async searchPlaylists(query: string): Promise<YtdlpPlaylistResult[]> {
    try {
      return await innertube.searchPlaylists(query);
    } catch (e) {
      this.logger.warn('Playlist search failed', e instanceof Error ? e.message : e);
      return [];
    }
  }

  async getRelated(videoId: string, limit = 10): Promise<YtdlpSearchResult[]> {
    try {
      return await innertube.getRelatedVideos(videoId, limit);
    } catch (e) {
      this.logger.warn('Related videos failed', e instanceof Error ? e.message : e);
      return [];
    }
  }

  private sortResults(results: YtdlpSearchResult[]): YtdlpSearchResult[] {
    return results.sort((a, b) => {
      if (a.isOfficial !== b.isOfficial) return b.isOfficial ? 1 : -1;
      const musicRe = /\b(official|m\/?v|audio|lyrics|music video)\b/i;
      const aMusic = musicRe.test(a.title) ? 1 : 0;
      const bMusic = musicRe.test(b.title) ? 1 : 0;
      if (aMusic !== bMusic) return bMusic - aMusic;
      return (b.views ?? 0) - (a.views ?? 0);
    });
  }

  async search(query: string, limit = 20): Promise<YtdlpSearchResult[]> {
    const { results } = await this.searchInnertube(query);
    return results.slice(0, limit);
  }

  async getPlaylistTracks(playlistId: string): Promise<YtdlpSearchResult[]> {
    try {
      const { stdout } = await execFileAsync(
        this.ytdlpPath,
        ['--flat-playlist', '--dump-json', `https://www.youtube.com/playlist?list=${playlistId}`],
        { timeout: YTDLP_PLAYLIST_TIMEOUT_MS, maxBuffer: YTDLP_PLAYLIST_MAX_BUFFER },
      );
      return stdout
        .trim()
        .split('\n')
        .map((line) => {
          const entry = JSON.parse(line) as YtdlpPlaylistEntry;
          const title = entry.title ?? '';
          if (!entry.id || title === '[Deleted video]' || title === '[Private video]') return null;
          return {
            id: entry.id,
            title,
            artist: entry.uploader ?? entry.channel ?? '',
            thumbnail: `https://i.ytimg.com/vi/${entry.id}/mqdefault.jpg`,
            duration: entry.duration ?? 0,
          };
        })
        .filter(
          (r): r is YtdlpSearchResult =>
            r !== null && r.duration >= TRACK_MIN_DURATION_SEC && r.duration <= TRACK_MAX_DURATION_SEC,
        );
    } catch (e) {
      this.logger.warn(`Failed to get playlist ${playlistId}`, e instanceof Error ? e.message : e);
      return [];
    }
  }

  /** 단일 영상 메타데이터 조회 */
  async getVideoMeta(videoId: string): Promise<YtdlpPlaylistTrack> {
    try {
      const { stdout } = await execFileAsync(
        this.ytdlpPath,
        ['--dump-json', '--skip-download', `https://youtube.com/watch?v=${videoId}`],
        { timeout: YTDLP_TIMEOUT_MS },
      );
      const entry = JSON.parse(stdout) as YtdlpVideoMeta;
      const duration = entry.duration ?? 0;
      const available = duration >= TRACK_MIN_DURATION_SEC && duration <= TRACK_MAX_DURATION_SEC;
      return {
        id: videoId,
        title: entry.title ?? '',
        artist: entry.uploader ?? entry.channel ?? '',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        duration,
        available,
      };
    } catch (e) {
      this.logger.warn(`Failed to get video meta for ${videoId}`, e instanceof Error ? e.message : e);
      throw new AppException(ErrorCode.PLAYLIST_LOAD_FAILED);
    }
  }

  /** 플레이리스트 트랙 목록 (사용 불가 트랙 포함) */
  async getPlaylistTracksAll(playlistId: string): Promise<YtdlpPlaylistTrack[]> {
    try {
      const { stdout } = await execFileAsync(
        this.ytdlpPath,
        ['--flat-playlist', '--dump-json', `https://www.youtube.com/playlist?list=${playlistId}`],
        { timeout: YTDLP_PLAYLIST_TIMEOUT_MS, maxBuffer: YTDLP_PLAYLIST_MAX_BUFFER },
      );
      return stdout
        .trim()
        .split('\n')
        .map((line) => {
          const entry = JSON.parse(line) as YtdlpPlaylistEntry;
          const title = entry.title ?? '';
          const id = entry.id;
          const isUnavailable = !id || title === '[Deleted video]' || title === '[Private video]';
          const duration = entry.duration ?? 0;
          const available = !isUnavailable && duration >= TRACK_MIN_DURATION_SEC && duration <= TRACK_MAX_DURATION_SEC;
          return {
            id: id ?? '',
            title: isUnavailable ? title || '[비공개 동영상]' : title,
            artist: entry.uploader ?? entry.channel ?? '',
            thumbnail: id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : '',
            duration,
            available,
          };
        })
        .filter((r) => r.id !== '');
    } catch (e) {
      this.logger.warn(`Failed to get playlist ${playlistId}`, e instanceof Error ? e.message : e);
      throw new AppException(ErrorCode.PLAYLIST_LOAD_FAILED);
    }
  }

  async getAudioUrl(videoId: string): Promise<string> {
    try {
      const { stdout } = await execFileAsync(
        this.ytdlpPath,
        ['-f', YTDLP_FORMAT, '--get-url', `https://youtube.com/watch?v=${videoId}`],
        { timeout: YTDLP_TIMEOUT_MS },
      );
      return stdout.trim();
    } catch (e) {
      this.logger.warn(`Failed to get audio URL for ${videoId}`, e instanceof Error ? e.message : e);
      throw new AppException(ErrorCode.PLAYER_008);
    }
  }

  async getAudioInfo(videoId: string): Promise<AudioInfo> {
    try {
      const { stdout } = await execFileAsync(
        this.ytdlpPath,
        ['-f', YTDLP_FORMAT, '--dump-json', `https://youtube.com/watch?v=${videoId}`],
        { timeout: YTDLP_TIMEOUT_MS },
      );
      const info = JSON.parse(stdout) as YtdlpVideoMeta;
      return {
        codec: info.acodec ?? 'unknown',
        bitrateKbps: Math.round(info.abr ?? 0),
      };
    } catch (e) {
      this.logger.warn(`Failed to get audio info for ${videoId}`, e instanceof Error ? e.message : e);
      throw new AppException(ErrorCode.PLAYER_007);
    }
  }

  /** yt-dlp -o - 로 오디오 원본 데이터를 Buffer로 다운로드 */
  async downloadAudio(videoId: string): Promise<Buffer> {
    const { stdout } = await execFileAsync(
      this.ytdlpPath,
      ['-f', YTDLP_FORMAT, '-o', '-', `https://youtube.com/watch?v=${videoId}`],
      { timeout: YTDLP_PLAYLIST_TIMEOUT_MS, maxBuffer: YTDLP_PLAYLIST_MAX_BUFFER, encoding: 'buffer' },
    );
    return Buffer.from(stdout);
  }
}
