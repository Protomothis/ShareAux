import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { appendFile, mkdir, readdir, readFile, stat, unlink } from 'fs/promises';
import { join } from 'node:path';

export interface ErrorLogEntry {
  timestamp: number;
  method: string;
  path: string;
  status: number;
  message: string;
  stack?: string;
  userId?: string;
}

const MAX_BUFFER = 500;
const MAX_DIR_SIZE = 20 * 1024 * 1024; // 20MB
const LOG_DIR = join(process.cwd(), '.log', 'errors');

@Injectable()
export class ErrorLogService implements OnModuleInit {
  private readonly logger = new Logger(ErrorLogService.name);
  private readonly buffer: ErrorLogEntry[] = [];
  private readonly filePath: string;

  constructor() {
    this.filePath = join(LOG_DIR, `errors-${Date.now()}.jsonl`);
  }

  async onModuleInit(): Promise<void> {
    await mkdir(LOG_DIR, { recursive: true });
    await this.pruneOldFiles();
  }

  async log(entry: ErrorLogEntry): Promise<void> {
    this.buffer.push(entry);
    if (this.buffer.length > MAX_BUFFER) this.buffer.shift();
    try {
      await appendFile(this.filePath, JSON.stringify(entry) + '\n');
    } catch (e) {
      this.logger.warn(`Failed to write error log: ${e}`);
    }
  }

  getRecentErrors(page: number, limit: number): { items: ErrorLogEntry[]; total: number } {
    const total = this.buffer.length;
    // 최신순 — 뒤에서부터
    const start = Math.max(0, total - page * limit);
    const end = Math.max(0, total - (page - 1) * limit);
    return { items: this.buffer.slice(start, end).reverse(), total };
  }

  async getErrorFiles(): Promise<Array<{ filename: string; sizeBytes: number; errorCount: number }>> {
    const files = await readdir(LOG_DIR).catch(() => [] as string[]);
    const result: Array<{ filename: string; sizeBytes: number; errorCount: number }> = [];
    for (const f of files
      .filter((n) => n.endsWith('.jsonl'))
      .sort()
      .reverse()) {
      const s = await stat(join(LOG_DIR, f));
      const content = await readFile(join(LOG_DIR, f), 'utf-8').catch(() => '');
      result.push({ filename: f, sizeBytes: s.size, errorCount: content.trim().split('\n').filter(Boolean).length });
    }
    return result;
  }

  async getErrorFile(
    filename: string,
    page: number,
    limit: number,
  ): Promise<{ items: ErrorLogEntry[]; total: number }> {
    // 보안: 경로 탈출 방지
    if (filename.includes('/') || filename.includes('..')) return { items: [], total: 0 };
    const content = await readFile(join(LOG_DIR, filename), 'utf-8').catch(() => '');
    const lines = content.trim().split('\n').filter(Boolean);
    const total = lines.length;
    // 최신순 (파일 끝이 최신)
    const reversed = lines.reverse();
    const items = reversed.slice((page - 1) * limit, page * limit).map((l) => JSON.parse(l) as ErrorLogEntry);
    return { items, total };
  }

  private async pruneOldFiles(): Promise<void> {
    const files = await readdir(LOG_DIR).catch(() => [] as string[]);
    const jsonlFiles = files.filter((n) => n.endsWith('.jsonl')).sort();
    let totalSize = 0;
    const sizes = new Map<string, number>();
    for (const f of jsonlFiles) {
      const s = await stat(join(LOG_DIR, f)).catch(() => ({ size: 0 }));
      sizes.set(f, s.size);
      totalSize += s.size;
    }
    // 오래된 파일부터 삭제
    for (const f of jsonlFiles) {
      if (totalSize <= MAX_DIR_SIZE) break;
      await unlink(join(LOG_DIR, f)).catch(() => {});
      totalSize -= sizes.get(f) ?? 0;
      this.logger.log(`Pruned old error log: ${f}`);
    }
  }
}
