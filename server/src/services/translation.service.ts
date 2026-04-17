import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Track } from '../entities/track.entity.js';
import { SettingsService } from './settings.service.js';

interface TranslationJob {
  trackId: string;
  roomIds: string[];
}

interface GeminiModel {
  generateContent: (prompt: string) => Promise<{ response: { text: () => string } }>;
}

interface ParsedLine {
  time: string;
  text: string;
}

const JA_REGEX = /[\u3040-\u30FF\u4E00-\u9FFF]/;

/** 가사 텍스트에서 언어 감지 */
function detectLang(text: string): string | null {
  const clean = text.replace(/[\s\p{P}\p{S}\d]/gu, '');
  if (!clean) return null;
  let ja = 0,
    ko = 0,
    en = 0;
  for (const ch of clean) {
    const c = ch.codePointAt(0)!;
    if ((c >= 0x3040 && c <= 0x30ff) || (c >= 0x4e00 && c <= 0x9fff)) ja++;
    else if (c >= 0xac00 && c <= 0xd7af) ko++;
    else if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) en++;
  }
  const total = ja + ko + en || 1;
  if (ko / total > 0.1) return 'ko';
  if (ja / total > 0.2) return 'ja';
  if (en / total > 0.3) return 'en';
  return null;
}

@Injectable()
export class TranslationService implements OnModuleInit {
  private readonly logger = new Logger(TranslationService.name);
  private readonly queue: TranslationJob[] = [];
  private processing = false;
  private dailyCount = 0;
  private lastResetDate = '';
  private geminiModel: GeminiModel | null = null;
  private onUpdatedCallback?: (trackId: string, roomIds: string[]) => void;

  constructor(
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) return;
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = this.settings.get('translation.model', 'gemini-2.5-flash-lite');
      this.geminiModel = genAI.getGenerativeModel({ model });
      this.logger.log(`Gemini initialized (${model})`);
    } catch (e) {
      this.logger.warn(`Gemini init failed: ${(e as Error).message}`);
    }
  }

  get isEnabled(): boolean {
    return !!this.geminiModel && this.settings.getBoolean('translation.enabled', true);
  }

  onUpdated(cb: (trackId: string, roomIds: string[]) => void): void {
    this.onUpdatedCallback = cb;
  }

  enqueue(trackId: string, roomId: string): void {
    const existing = this.queue.find((j) => j.trackId === trackId);
    if (existing) {
      if (!existing.roomIds.includes(roomId)) existing.roomIds.push(roomId);
      return;
    }
    this.queue.push({ trackId, roomIds: [roomId] });
    void this.processNext();
  }

  // ─── Queue Processing ─────────────────────────────────

  private async processNext(): Promise<void> {
    if (this.processing || !this.queue.length) return;
    this.processing = true;
    const job = this.queue.shift()!;

    try {
      await this.processTrack(job);
    } catch (e) {
      this.logger.error(`Translation failed for ${job.trackId}: ${(e as Error).message}`);
    }

    this.processing = false;
    void this.processNext();
  }

  private async processTrack(job: TranslationJob): Promise<void> {
    const track = await this.trackRepo
      .createQueryBuilder('t')
      .addSelect('t.lyricsData')
      .where('t.id = :id', { id: job.trackId })
      .getOne();

    if (!track?.lyricsData || track.lyricsTransStatus === 'done' || track.lyricsTransStatus === 'pending') return;

    await this.trackRepo.update(track.id, { lyricsTransStatus: 'pending' });

    try {
      const lyricsText = this.extractText(track.lyricsData);
      const lang = track.lyricsLang ?? detectLang(lyricsText);
      if (lang) await this.trackRepo.update(track.id, { lyricsLang: lang });

      if (lang === 'ko') {
        // 한국어는 번역 불필요 — done 처리만, 클라이언트 알림 없음
        await this.trackRepo.update(track.id, { lyricsTransStatus: 'done' });
        return;
      }

      if (!this.geminiModel || !this.checkDailyLimit()) {
        await this.trackRepo.update(track.id, { lyricsTransStatus: 'failed' });
        return;
      }

      const lines = this.parseLrc(track.lyricsData);
      const isJa = lang === 'ja';

      // Gemini 1회 호출: 번역 + (일본어면 한글 발음도)
      const result = await this.callGemini(lines, lang ?? 'en', isJa);

      if (!result) {
        await this.trackRepo.update(track.id, { lyricsTransStatus: 'failed' });
        this.onUpdatedCallback?.(job.trackId, job.roomIds);
        return;
      }

      const translatedLrc = lines.map((l, i) => `${l.time} ${result.translations.get(i + 1) ?? ''}`).join('\n');

      const update: Partial<Track> = { lyricsTranslated: translatedLrc, lyricsTransStatus: 'done' as const };

      if (isJa && result.readings.size > 0) {
        update.lyricsRuby = lines.map((l, i) => `${l.time} ${result.readings.get(i + 1) ?? l.text}`).join('\n');
      }

      await this.trackRepo.update(track.id, update);
      this.onUpdatedCallback?.(job.trackId, job.roomIds);
    } catch {
      await this.trackRepo.update(track.id, { lyricsTransStatus: 'failed' });
    }
  }

  // ─── Gemini ────────────────────────────────────────────

  private async callGemini(
    lines: ParsedLine[],
    lang: string,
    includeReading: boolean,
  ): Promise<{ translations: Map<number, string>; readings: Map<number, string> } | null> {
    const numbered = lines.map((l, i) => `${i + 1}|${l.text}`).join('\n');
    const langName = lang === 'ja' ? '일본어' : lang === 'zh' ? '중국어' : '영어';

    const format = includeReading ? 'N|한국어번역|한글발음' : 'N|한국어번역';
    const readingRule = includeReading
      ? '\n- 한글발음: 원문 발음을 한글로 표기 (외래어 표기법, 영문/기호 그대로)\n- 반드시 번역|발음 두 칸 모두 채울 것'
      : '';
    const example = includeReading
      ? '\n예시:\n1|砂を払えば → 1|모래를 털면|스나오 하라에바\n2|I love you → 2|널 사랑해|I love you'
      : '';

    const prompt = `${langName}→한국어 가사 번역. ${lines.length}줄 유지. 가사체 직역. ${format} 형식만.${readingRule}${example}

${numbered}`;

    try {
      const result = await this.geminiModel!.generateContent(prompt);
      const text = result.response.text();
      this.dailyCount++;

      const translations = new Map<number, string>();
      const readings = new Map<number, string>();

      for (const line of text.split('\n')) {
        if (includeReading) {
          const m = line.match(/^(\d+)\|([^|]*)\|(.+)/);
          if (m) {
            translations.set(Number(m[1]), m[2].trim());
            readings.set(Number(m[1]), m[3].trim());
            continue;
          }
        }
        const m2 = line.match(/^(\d+)\|(.+)/);
        if (m2) translations.set(Number(m2[1]), m2[2].trim());
      }

      if (translations.size < lines.length * 0.8) {
        this.logger.warn(`Translation line mismatch: expected ${lines.length}, got ${translations.size}`);
        return null;
      }

      return { translations, readings };
    } catch (e) {
      this.logger.error(`Gemini error: ${(e as Error).message}`);
      return null;
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
        const m = line.match(/^(\[[\d:.]+\])\s*(.*)/);
        if (!m) return null;
        const text = m[2].replace(/<[\d:.]+>\s*/g, '').trim();
        return text ? { time: m[1], text } : null;
      })
      .filter((x): x is ParsedLine => !!x);
  }

  private checkDailyLimit(): boolean {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.lastResetDate) {
      this.dailyCount = 0;
      this.lastResetDate = today;
    }
    const limit = this.settings.getNumber('translation.dailyLimit', 200);
    return this.dailyCount < limit;
  }
}
