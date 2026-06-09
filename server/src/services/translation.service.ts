import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Track } from '../entities/track.entity.js';
import { LyricsTransStatus } from '../types/lyrics-trans-status.enum.js';
import { OptionKey } from '../types/settings.types.js';
import { isTranslationLang, TranslationLang } from '../types/translation-lang.enum.js';
import { detectLang } from './detect-lang.js';
import { SettingsService } from './settings.service.js';
import type { ParsedLine } from './translation-gemini.service.js';
import { TranslationGeminiService } from './translation-gemini.service.js';

// ─── Types ───────────────────────────────────────────────

interface TranslationJob {
  trackId: string;
  roomIds: string[];
}

// ─── Constants ───────────────────────────────────────────

const CONCURRENCY = 2;

@Injectable()
export class TranslationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TranslationService.name);
  private readonly queue: TranslationJob[] = [];
  private activeCount = 0;

  constructor(
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    private readonly settings: SettingsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly gemini: TranslationGeminiService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.gemini.initGemini();
    await this.restoreQueue();
  }

  // ─── Public API ────────────────────────────────────────

  get isEnabled(): boolean {
    return this.gemini.isReady && this.settings.getBoolean(OptionKey.TranslationEnabled);
  }

  async reinitialize(): Promise<void> {
    await this.gemini.reinitialize();
  }

  enqueue(trackId: string, roomId: string): void {
    const existing = this.queue.find((j) => j.trackId === trackId);
    if (existing) {
      if (!existing.roomIds.includes(roomId)) existing.roomIds.push(roomId);
      return;
    }
    this.queue.push({ trackId, roomIds: [roomId] });
    this.drain();
  }

  // ─── Queue (영속성) ────────────────────────────────────

  private async restoreQueue(): Promise<void> {
    const pending = await this.trackRepo.find({
      where: { lyricsTransStatus: LyricsTransStatus.Pending },
      select: ['id'],
    });
    if (!pending.length) return;
    for (const t of pending) {
      this.queue.push({ trackId: t.id, roomIds: [] });
    }
    this.logger.log(`Restored ${pending.length} pending translation(s)`);
    this.drain();
  }

  // ─── Concurrency ───────────────────────────────────────

  private drain(): void {
    while (this.activeCount < CONCURRENCY && this.queue.length > 0) {
      const job = this.queue.shift()!;
      this.activeCount++;
      this.processTrack(job)
        .catch((e: unknown) => this.logger.error(`Translation failed for ${job.trackId}: ${(e as Error).message}`))
        .finally(() => {
          this.activeCount--;
          this.drain();
        });
    }
  }

  // ─── Process ───────────────────────────────────────────

  private async processTrack(job: TranslationJob): Promise<void> {
    const track = await this.trackRepo
      .createQueryBuilder('t')
      .addSelect('t.lyricsData')
      .where('t.id = :id', { id: job.trackId })
      .getOne();

    if (!track?.lyricsData || track.lyricsTransStatus === LyricsTransStatus.Done) return;
    if (track.lyricsTransStatus === LyricsTransStatus.Pending) return;

    await this.trackRepo.update(track.id, { lyricsTransStatus: LyricsTransStatus.Pending });

    try {
      const lyricsText = this.extractText(track.lyricsData);
      const lang = track.lyricsLang ?? detectLang(lyricsText);
      if (lang) await this.trackRepo.update(track.id, { lyricsLang: lang });

      const targetLangRaw = this.settings.get(OptionKey.TranslationTargetLang);
      if (!isTranslationLang(targetLangRaw)) {
        await this.trackRepo.update(track.id, { lyricsTransStatus: LyricsTransStatus.Failed });
        return;
      }
      const targetLang = targetLangRaw;
      if (lang === targetLang) {
        await this.trackRepo.update(track.id, { lyricsTransStatus: LyricsTransStatus.Done });
        return;
      }

      if (!this.gemini.isReady || !this.gemini.checkDailyLimit()) {
        await this.trackRepo.update(track.id, { lyricsTransStatus: LyricsTransStatus.Failed });
        return;
      }

      const lines = this.parseLrc(track.lyricsData);
      const isJa = lang === 'ja';
      const includeReading = isJa && (targetLang === TranslationLang.Ko || targetLang === TranslationLang.En);

      const result = await this.gemini.translateWithChunks(lines, lang ?? 'en', targetLang, includeReading);

      if (!result || result.translations.size < lines.length * 0.5) {
        await this.trackRepo.update(track.id, { lyricsTransStatus: LyricsTransStatus.Failed });
        return;
      }

      const translatedLrc = lines.map((l, i) => `${l.time} ${result.translations.get(i + 1) ?? ''}`).join('\n');
      const update: Partial<Track> = { lyricsTranslated: translatedLrc, lyricsTransStatus: LyricsTransStatus.Done };

      if (includeReading && result.readings.size >= lines.length * 0.5) {
        update.lyricsRuby = lines.map((l, i) => `${l.time} ${result.readings.get(i + 1) ?? ''}`).join('\n');
      }

      await this.trackRepo.update(track.id, update);
      this.eventEmitter.emit('translation.updated', job.trackId, job.roomIds);
    } catch {
      await this.trackRepo.update(track.id, { lyricsTransStatus: LyricsTransStatus.Failed });
    }
  }

  // ─── Helpers ───────────────────────────────────────────

  private extractText(lrc: string): string {
    return lrc
      .split('\n')
      .map((line) => line.replace(/^\[[\d:.]+\]\s*/, '').replace(/<[\d:.]+>\s*/g, ''))
      .filter(Boolean)
      .join('\n');
  }

  private parseLrc(lrc: string): ParsedLine[] {
    return lrc
      .split('\n')
      .map((line) => {
        const m = /^(\[[\d:.]+\])\s*(.*)/.exec(line);
        if (!m) return null;
        const text = m[2].replace(/<[\d:.]+>\s*/g, '').trim();
        return text ? { time: m[1], text } : null;
      })
      .filter((x): x is ParsedLine => !!x);
  }
}
