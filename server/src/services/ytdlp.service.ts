/* eslint-disable @typescript-eslint/no-explicit-any -- YouTube innertube API has no types */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';

import { YTDLP_FORMAT, YTDLP_PLAYLIST_MAX_BUFFER, YTDLP_PLAYLIST_TIMEOUT_MS, YTDLP_TIMEOUT_MS } from '../constants.js';
import type { AudioInfo } from '../types/index.js';

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
          const entry = JSON.parse(line) as Record<string, unknown>;
          const title = (entry.title as string) ?? '';
          if (!entry.id || title === '[Deleted video]' || title === '[Private video]') return null;
          return {
            id: entry.id as string,
            title,
            artist: (entry.uploader as string) ?? (entry.channel as string) ?? '',
            thumbnail: `https://i.ytimg.com/vi/${entry.id as string}/mqdefault.jpg`,
            duration: (entry.duration as number) ?? 0,
          };
        })
        .filter((r): r is YtdlpSearchResult => r !== null && r.duration >= 30 && r.duration <= 900);
    } catch (e) {
      this.logger.warn(`Failed to get playlist ${playlistId}`, e instanceof Error ? e.message : e);
      return [];
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
      throw new NotFoundException(`Audio URL not found for ${videoId}`);
    }
  }

  async getAudioInfo(videoId: string): Promise<AudioInfo> {
    try {
      const { stdout } = await execFileAsync(
        this.ytdlpPath,
        ['-f', YTDLP_FORMAT, '--dump-json', `https://youtube.com/watch?v=${videoId}`],
        { timeout: YTDLP_TIMEOUT_MS },
      );
      const info = JSON.parse(stdout) as Record<string, unknown>;
      return {
        codec: (info.acodec as string) ?? 'unknown',
        bitrateKbps: Math.round((info.abr as number) ?? 0),
      };
    } catch (e) {
      this.logger.warn(`Failed to get audio info for ${videoId}`, e instanceof Error ? e.message : e);
      throw new NotFoundException(`Audio info not found for ${videoId}`);
    }
  }

  /** yt-dlp -o - 로 오디오 원본 데이터를 Buffer로 다운로드 */
  async downloadAudio(videoId: string): Promise<Buffer> {
    const { stdout } = await execFileAsync(
      this.ytdlpPath,
      ['-f', YTDLP_FORMAT, '-o', '-', `https://youtube.com/watch?v=${videoId}`],
      { timeout: YTDLP_PLAYLIST_TIMEOUT_MS, maxBuffer: YTDLP_PLAYLIST_MAX_BUFFER, encoding: 'buffer' as never },
    );
    return Buffer.from(stdout);
  }
}
