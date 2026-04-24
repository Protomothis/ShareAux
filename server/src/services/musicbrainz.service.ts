import { Injectable, Logger } from '@nestjs/common';

export interface MusicBrainzResult {
  title: string;
  artist: string;
  album?: string;
}

interface MbRecording {
  title: string;
  score: number;
  length?: number;
  'artist-credit'?: { name: string }[];
  releases?: { title: string }[];
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

  /** 후보 중 duration이 가장 가까운 recording 선택 */
  private pickBest(
    recordings: MbRecording[],
    durationMs?: number,
    minScore = 80,
    maxDiffMs = 10_000,
  ): MbRecording | null {
    const valid = recordings.filter((r) => r.score >= minScore);
    if (!valid.length) return null;
    if (!durationMs || valid.length === 1) return valid[0];

    let best = valid[0];
    let bestDiff = Infinity;
    for (const r of valid) {
      if (!r.length) continue;
      const diff = Math.abs(r.length - durationMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = r;
      }
    }
    // duration 차이 초과면 오매칭 가능성 — score 1위 우선
    return bestDiff > maxDiffMs ? valid[0] : best;
  }

  /** MusicBrainz recording 검색 (rate limit: 1req/sec) */
  async search(artist: string, title: string, durationMs?: number): Promise<MusicBrainzResult | null> {
    if (!title || title.length < 2) return null;

    await this.waitForSlot();

    const query = artist ? `recording:"${title}" AND artist:"${artist}"` : `recording:"${title}"`;
    try {
      const res = await fetch(
        `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(query)}&limit=25&fmt=json`,
        {
          headers: { 'User-Agent': 'ShareAux/0.1.6 (https://github.com/Protomothis/ShareAux)' },
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!res.ok) return null;

      const data = (await res.json()) as { recordings?: MbRecording[] };
      const minScore = artist ? 80 : 95;
      const maxDiff = artist ? 10_000 : 5_000;
      const best = this.pickBest(data.recordings ?? [], durationMs, minScore, maxDiff);
      if (!best) return null;

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
