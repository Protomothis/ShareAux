import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  PRELOAD_MAX_CONCURRENT,
  PRELOAD_MAX_MEMORY_BYTES,
  PRELOAD_MAX_PER_ROOM,
  PRELOAD_MAX_TRACK_DURATION_SEC,
  PRELOAD_RETRY_COUNT,
  PRELOAD_TTL_MS,
} from '../constants.js';
import { RoomQueue } from '../entities/room-queue.entity.js';
import type { PreloadEntry } from '../types/index.js';
import { PreloadState } from '../types/index.js';
import { YtdlpService } from './ytdlp.service.js';

@Injectable()
export class PreloadService {
  private readonly logger = new Logger(PreloadService.name);
  private entries = new Map<string, PreloadEntry>();

  // 동시 다운로드 풀
  private activeDownloads = 0;
  private downloadQueue: Array<() => void> = [];

  constructor(
    private readonly ytdlp: YtdlpService,
    @InjectRepository(RoomQueue) private readonly queueRepo: Repository<RoomQueue>,
  ) {}

  // --- Public API ---

  /** 프리로드된 Buffer 반환, 없으면 null */
  getBuffer(trackId: string): Buffer | null {
    const entry = this.entries.get(trackId);
    if (!entry || entry.state !== PreloadState.Preloaded) return null;
    if (Date.now() - entry.at > PRELOAD_TTL_MS) {
      this.releaseBuffer(trackId);
      return null;
    }
    return entry.buffer;
  }

  /** 기존 URL fallback용 — 하위 호환 */
  getUrl(trackId: string): string | null {
    return this.getBuffer(trackId) ? '__preloaded__' : null;
  }

  /** 재생 완료/스킵 시 호출 — refCount 감소, 0이면 해제 */
  release(trackId: string): void {
    const entry = this.entries.get(trackId);
    if (!entry) return;
    entry.refCount = Math.max(0, entry.refCount - 1);
    if (entry.refCount === 0) this.releaseBuffer(trackId);
  }

  /** 큐에 곡 추가 시 refCount 증가 */
  addRef(trackId: string): void {
    const entry = this.entries.get(trackId);
    if (entry) entry.refCount++;
  }

  /** 방 파괴 시 해당 방 큐의 모든 엔트리 정리 */
  releaseRoom(roomId: string): void {
    this.queueRepo
      .find({ where: { room: { id: roomId }, played: false }, relations: ['track'] })
      .then((items) => {
        for (const item of items) this.release(item.track.id);
      })
      .catch(() => {});
  }

  /** 방의 다음 곡들 프리로드 트리거 */
  triggerPreload(roomId: string): void {
    this.queueRepo
      .find({
        where: { room: { id: roomId }, played: false },
        order: { position: 'ASC' },
        relations: ['track'],
        take: PRELOAD_MAX_PER_ROOM,
      })
      .then((items) => {
        for (const item of items) {
          const tid = item.track.id;
          const existing = this.entries.get(tid);
          if (existing && (existing.state === PreloadState.Preloaded || existing.state === PreloadState.Downloading)) {
            continue;
          }
          // 긴 곡은 프리로드 스킵
          if (item.track.durationMs > PRELOAD_MAX_TRACK_DURATION_SEC * 1000) continue;

          this.startDownload(tid, item.track.youtubeId);
        }
      })
      .catch((e) => this.logger.warn(`triggerPreload failed for room ${roomId}:`, e));
  }

  /** 전체 메모리 사용량 */
  get totalMemory(): number {
    let total = 0;
    for (const entry of this.entries.values()) total += entry.size;
    return total;
  }

  /** 프리로드 완료된 트랙 수 */
  get preloadedCount(): number {
    let count = 0;
    for (const entry of this.entries.values()) {
      if (entry.state === PreloadState.Preloaded) count++;
    }
    return count;
  }

  // --- Internal ---

  private async startDownload(trackId: string, youtubeId: string, retry = 0): Promise<void> {
    const entry: PreloadEntry = {
      state: PreloadState.Downloading,
      buffer: null,
      size: 0,
      youtubeId,
      refCount: 1,
      at: 0,
    };
    this.entries.set(trackId, entry);

    try {
      await this.acquireSlot();
      // 다운로드 시작 전 eviction 체크
      this.evictIfNeeded();

      const buffer = await this.ytdlp.downloadAudio(youtubeId);
      entry.buffer = buffer;
      entry.size = buffer.length;
      entry.state = PreloadState.Preloaded;
      entry.at = Date.now();
      this.logger.log(`Preloaded ${trackId} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
    } catch (e) {
      if (retry < PRELOAD_RETRY_COUNT) {
        this.releaseSlot();
        this.logger.warn(`Preload retry ${retry + 1}/${PRELOAD_RETRY_COUNT} for ${trackId}`);
        return this.startDownload(trackId, youtubeId, retry + 1);
      }
      entry.state = PreloadState.Failed;
      this.logger.warn(`Preload failed for ${trackId}: ${e instanceof Error ? e.message : e}`);
    } finally {
      this.releaseSlot();
    }
  }

  private releaseBuffer(trackId: string): void {
    const entry = this.entries.get(trackId);
    if (!entry) return;
    entry.buffer = null;
    entry.size = 0;
    this.entries.delete(trackId);
  }

  private evictIfNeeded(): void {
    if (this.totalMemory <= PRELOAD_MAX_MEMORY_BYTES) return;

    // 가장 오래된 preloaded 엔트리부터 해제
    const sorted = [...this.entries.entries()]
      .filter(([, e]) => e.state === PreloadState.Preloaded)
      .sort(([, a], [, b]) => a.at - b.at);

    for (const [id] of sorted) {
      this.releaseBuffer(id);
      if (this.totalMemory <= PRELOAD_MAX_MEMORY_BYTES) break;
    }
  }

  private async acquireSlot(): Promise<void> {
    if (this.activeDownloads < PRELOAD_MAX_CONCURRENT) {
      this.activeDownloads++;
      return;
    }
    await new Promise<void>((r) => this.downloadQueue.push(r));
    this.activeDownloads++;
  }

  private releaseSlot(): void {
    this.activeDownloads--;
    this.downloadQueue.shift()?.();
  }
}
