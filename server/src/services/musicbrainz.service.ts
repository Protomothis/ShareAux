import { Injectable, Logger } from '@nestjs/common';

import { APP_VERSION } from '../constants.js';

const MUSICBRAINZ_API_URL = 'https://musicbrainz.org/ws/2/recording';
const MUSICBRAINZ_RATE_LIMIT_MS = 1100;
const UA = `ShareAux/${APP_VERSION} (https://github.com/Protomothis/ShareAux)`;

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
      await new Promise((r) => setTimeout(r, MUSICBRAINZ_RATE_LIMIT_MS));
    }
    this.processing = false;
  }

  private waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      void this.processQueue();
    });
  }

  /** 간이 텍스트 유사도 — 소문자 정규화 후 포함 관계 확인 */
  private titleMatches(query: string, candidate: string): boolean {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u3040-\u9fff\uac00-\ud7af]/g, '');
    const q = norm(query);
    const c = norm(candidate);
    if (!q || !c) return false;
    return c.includes(q) || q.includes(c);
  }

  /** 후보 중 title 유사도 + duration이 가장 가까운 recording 선택 */
  private pickBest(
    recordings: MbRecording[],
    queryTitle: string,
    durationMs?: number,
    minScore = 80,
    maxDiffMs = 10_000,
  ): MbRecording | null {
    const valid = recordings.filter((r) => r.score >= minScore && this.titleMatches(queryTitle, r.title));
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
    return bestDiff > maxDiffMs ? null : best;
  }

  /** MusicBrainz recording 검색 (rate limit: 1req/sec) */
  async search(artist: string, title: string, durationMs?: number): Promise<MusicBrainzResult | null> {
    if (!title || title.length < 2) return null;

    await this.waitForSlot();

    const query = artist ? `recording:"${title}" AND artist:"${artist}"` : `recording:"${title}"`;
    try {
      const res = await fetch(`${MUSICBRAINZ_API_URL}?query=${encodeURIComponent(query)}&limit=25&fmt=json`, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return null;

      const data = (await res.json()) as { recordings?: MbRecording[] };
      const minScore = artist ? 85 : 95;
      const maxDiff = artist ? 5_000 : 3_000;
      const best = this.pickBest(data.recordings ?? [], title, durationMs, minScore, maxDiff);
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
