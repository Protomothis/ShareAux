import { Injectable, Logger } from '@nestjs/common';

export interface MusicBrainzResult {
  title: string;
  artist: string;
  album?: string;
}

@Injectable()
export class MusicBrainzService {
  private readonly logger = new Logger(MusicBrainzService.name);
  private queue: (() => void)[] = [];
  private processing = false;

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    while (this.queue.length > 0) {
      const resolve = this.queue.shift()!;
      resolve();
      await new Promise((r) => setTimeout(r, 1100));
    }
    this.processing = false;
  }

  private waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      void this.processQueue();
    });
  }

  /** MusicBrainz recording 검색 (rate limit: 1req/sec) */
  async search(artist: string, title: string): Promise<MusicBrainzResult | null> {
    if (!artist || !title || title.length < 2) return null;

    await this.waitForSlot();

    const q = encodeURIComponent(`recording:"${title}" AND artist:"${artist}"`);
    try {
      const res = await fetch(`https://musicbrainz.org/ws/2/recording?query=${q}&limit=3&fmt=json`, {
        headers: { 'User-Agent': 'ShareAux/0.1.4 (https://github.com/Protomothis/ShareAux)' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return null;

      const data = (await res.json()) as {
        recordings?: {
          title: string;
          score: number;
          'artist-credit'?: { name: string }[];
          releases?: { title: string }[];
        }[];
      };

      const best = data.recordings?.[0];
      if (!best || best.score < 80) return null;

      return {
        title: best.title,
        artist: best['artist-credit']?.[0]?.name ?? artist,
        album: best.releases?.[0]?.title,
      };
    } catch (e) {
      this.logger.warn(`MusicBrainz search failed: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }
}
