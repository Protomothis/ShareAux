import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

export interface MetricsPoint {
  timestamp: number;
  connections: number;
  heapUsedMB: number;
  rssMB: number;
  preloadMemoryMB: number;
  ffmpegProcesses: number;
}

const MAX_POINTS = 8640; // 24h at 10s intervals

@Injectable()
export class MetricsService {
  private readonly buffer: MetricsPoint[] = [];

  // 외부 서비스가 setter로 보고
  private _connections = 0;
  private _preloadMemoryBytes = 0;
  private _ffmpegProcesses = 0;

  setConnections(n: number): void {
    this._connections = n;
  }

  setPreloadMemory(bytes: number): void {
    this._preloadMemoryBytes = bytes;
  }

  setFfmpegProcesses(n: number): void {
    this._ffmpegProcesses = n;
  }

  @Interval(10_000)
  collectMetrics(): void {
    const mem = process.memoryUsage();
    const point: MetricsPoint = {
      timestamp: Date.now(),
      connections: this._connections,
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
      preloadMemoryMB: Math.round((this._preloadMemoryBytes / 1024 / 1024) * 10) / 10,
      ffmpegProcesses: this._ffmpegProcesses,
    };
    this.buffer.push(point);
    if (this.buffer.length > MAX_POINTS) this.buffer.shift();
  }

  getRealtimeMetrics(since?: number): MetricsPoint[] {
    if (!since) return [...this.buffer];
    return this.buffer.filter((p) => p.timestamp > since);
  }
}
