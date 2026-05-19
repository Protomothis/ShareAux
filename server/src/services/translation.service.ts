import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Track } from '../entities/track.entity.js';
import { OptionKey } from '../types/settings.types.js';
import { TranslationLang } from '../types/translation-lang.enum.js';
import { detectLang } from './detect-lang.js';
import { SettingsService } from './settings.service.js';

// ─── Types ───────────────────────────────────────────────

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

interface TranslationResult {
  translations: Map<number, string>;
  readings: Map<number, string>;
}

// ─── Constants ───────────────────────────────────────────

const CHUNK_SIZE = 40;
const CONCURRENCY = 2;
const CONTEXT_OVERLAP = 5;

/** N|번역 또는 N|번역|발음 — 구분자 유연 (|, │, /, 탭) */
const LINE_WITH_READING = /^\s*(\d+)\s*[|│/\t]\s*([^|│/\t]*?)\s*[|│/\t]\s*(.+?)\s*$/;
const LINE_TRANSLATION = /^\s*(\d+)\s*[.|)│/\t]\s*(.+?)\s*$/;

const LANG_NAMES: Record<TranslationLang, string> = {
  [TranslationLang.Ko]: 'Korean',
  [TranslationLang.En]: 'English',
  [TranslationLang.Ja]: 'Japanese',
  [TranslationLang.Zh]: 'Chinese',
  [TranslationLang.ZhTW]: 'Traditional Chinese',
  [TranslationLang.Es]: 'Spanish',
  [TranslationLang.Fr]: 'French',
  [TranslationLang.De]: 'German',
  [TranslationLang.Pt]: 'Portuguese',
  [TranslationLang.Th]: 'Thai',
  [TranslationLang.Vi]: 'Vietnamese',
  [TranslationLang.Id]: 'Indonesian',
};

const SOURCE_LANG_NAMES: Record<string, string> = {
  ja: '일본어',
  zh: '중국어',
  en: '영어',
  ko: '한국어',
  es: '스페인어',
  fr: '프랑스어',
  de: '독일어',
  pt: '포르투갈어',
  th: '태국어',
  vi: '베트남어',
  id: '인도네시아어',
};

@Injectable()
export class TranslationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TranslationService.name);
  private readonly queue: TranslationJob[] = [];
  private activeCount = 0;
  private dailyCount = 0;
  private lastResetDate = '';
  private geminiModel: GeminiModel | null = null;

  constructor(
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    private readonly settings: SettingsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.initGemini();
    await this.restoreQueue();
  }

  // ─── Init ──────────────────────────────────────────────

  private async initGemini(): Promise<void> {
    const apiKey = this.settings.getSecret(OptionKey.GeminiApiKey);
    if (!apiKey) return;
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = this.settings.get(OptionKey.TranslationModel);
      this.geminiModel = genAI.getGenerativeModel({
        model,
        generationConfig: { temperature: 0 },
      });
      this.logger.log(`Gemini initialized (${model})`);
    } catch (e) {
      this.logger.warn(`Gemini init failed: ${(e as Error).message}`);
    }
  }

  get isEnabled(): boolean {
    return !!this.geminiModel && this.settings.getBoolean(OptionKey.TranslationEnabled);
  }

  async reinitialize(): Promise<void> {
    this.geminiModel = null;
    await this.initGemini();
  }

  // ─── Queue (영속성) ────────────────────────────────────

  /** 서버 재시작 시 pending 상태 트랙 복구 */
  private async restoreQueue(): Promise<void> {
    const pending = await this.trackRepo.find({
      where: { lyricsTransStatus: 'pending' },
      select: ['id'],
    });
    if (!pending.length) return;

    // pending → 큐에 복원 (roomIds 비워둠 — 알림은 안 가지만 번역은 완료됨)
    for (const t of pending) {
      this.queue.push({ trackId: t.id, roomIds: [] });
    }
    this.logger.log(`Restored ${pending.length} pending translation(s)`);
    this.drain();
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

    if (!track?.lyricsData || track.lyricsTransStatus === 'done') return;
    // failed도 재시도 허용 (pending은 이미 다른 worker가 처리 중일 수 있으므로 스킵)
    if (track.lyricsTransStatus === 'pending') return;

    await this.trackRepo.update(track.id, { lyricsTransStatus: 'pending' });

    try {
      const lyricsText = this.extractText(track.lyricsData);
      const lang = track.lyricsLang ?? detectLang(lyricsText);
      if (lang) await this.trackRepo.update(track.id, { lyricsLang: lang });

      const targetLang = this.settings.get(OptionKey.TranslationTargetLang) as TranslationLang;
      if (lang === targetLang) {
        await this.trackRepo.update(track.id, { lyricsTransStatus: 'done' });
        return;
      }

      if (!this.geminiModel || !this.checkDailyLimit()) {
        await this.trackRepo.update(track.id, { lyricsTransStatus: 'failed' });
        return;
      }

      const lines = this.parseLrc(track.lyricsData);
      const isJa = lang === 'ja';
      const includeReading = isJa && (targetLang === TranslationLang.Ko || targetLang === TranslationLang.En);

      const result = await this.translateWithChunks(lines, lang ?? 'en', includeReading);

      if (!result || result.translations.size < lines.length * 0.5) {
        await this.trackRepo.update(track.id, { lyricsTransStatus: 'failed' });
        return;
      }

      const translatedLrc = lines.map((l, i) => `${l.time} ${result.translations.get(i + 1) ?? ''}`).join('\n');
      const update: Partial<Track> = { lyricsTranslated: translatedLrc, lyricsTransStatus: 'done' as const };

      if (includeReading && result.readings.size > 0) {
        update.lyricsRuby = lines.map((l, i) => `${l.time} ${result.readings.get(i + 1) ?? l.text}`).join('\n');
      }

      await this.trackRepo.update(track.id, update);
      this.eventEmitter.emit('translation.updated', job.trackId, job.roomIds);
    } catch {
      await this.trackRepo.update(track.id, { lyricsTransStatus: 'failed' });
    }
  }

  // ─── Chunk Translation ─────────────────────────────────

  private async translateWithChunks(
    lines: ParsedLine[],
    lang: string,
    includeReading: boolean,
  ): Promise<TranslationResult | null> {
    if (lines.length <= CHUNK_SIZE) {
      return this.callGemini(lines, 0, lang, includeReading, []);
    }

    const translations = new Map<number, string>();
    const readings = new Map<number, string>();

    for (let offset = 0; offset < lines.length; offset += CHUNK_SIZE) {
      const chunk = lines.slice(offset, offset + CHUNK_SIZE);
      // 이전 청크 마지막 줄을 컨텍스트로 포함 (번역 대상 아님, 문체 참고용)
      const context = offset > 0 ? lines.slice(Math.max(0, offset - CONTEXT_OVERLAP), offset) : [];
      const result = await this.callGemini(chunk, offset, lang, includeReading, context);
      if (!result) continue;
      for (const [k, v] of result.translations) translations.set(k, v);
      for (const [k, v] of result.readings) readings.set(k, v);
    }

    // 누락 보충 (1회)
    const missing = lines.map((l, i) => ({ idx: i + 1, text: l.text })).filter((m) => !translations.has(m.idx));

    if (missing.length > 0 && missing.length <= lines.length * 0.3) {
      const partial = await this.callGeminiPartial(missing, lang, includeReading);
      if (partial) {
        for (const [k, v] of partial.translations) translations.set(k, v);
        for (const [k, v] of partial.readings) readings.set(k, v);
      }
    }

    return { translations, readings };
  }

  // ─── Gemini ────────────────────────────────────────────

  private async callGemini(
    lines: ParsedLine[],
    offset: number,
    lang: string,
    includeReading: boolean,
    context: ParsedLine[],
  ): Promise<TranslationResult | null> {
    const numbered = lines.map((l, i) => `${offset + i + 1}|${l.text}`).join('\n');
    const targetLang = this.settings.get(OptionKey.TranslationTargetLang) as TranslationLang;
    const targetName = LANG_NAMES[targetLang];
    const sourceName = SOURCE_LANG_NAMES[lang] ?? lang;

    const format = includeReading ? `N|${targetName}|reading` : `N|${targetName}`;
    const readingRule = includeReading
      ? `
- reading: Romanized pronunciation of the original text
- Keep English words/symbols as-is in reading column
- Use consistent readings for the same kanji throughout
- Both translation and reading columns must be filled`
      : '';
    const example = includeReading
      ? `\nExample:\n1|砂を払えば → 1|${targetLang === 'ko' ? '모래를 털면' : 'If I brush off the sand'}|suna o haraeba\n2|I love you → 2|${targetLang === 'ko' ? '널 사랑해' : 'I love you'}|I love you`
      : '';

    const contextBlock =
      context.length > 0
        ? `\nPreceding lyrics (for context only, do NOT translate):\n${context.map((l) => l.text).join('\n')}\n`
        : '';

    const prompt = `Translate ${sourceName} lyrics to ${targetName}.
Rules:
- Output exactly ${lines.length} lines. Never omit any.
- Output ONLY in ${format} format. No explanations.
- Literal lyrical translation. Minimize paraphrasing.
- Keep interjections/onomatopoeia (oh, yeah, la la) untranslated${readingRule}${example}${contextBlock}
${numbered}`;

    try {
      const result = await this.geminiModel!.generateContent(prompt);
      const text = result.response.text();
      this.dailyCount++;
      return this.parseResponse(text, includeReading);
    } catch (e) {
      this.logger.error(`Gemini error: ${(e as Error).message}`);
      return null;
    }
  }

  private async callGeminiPartial(
    missing: { idx: number; text: string }[],
    lang: string,
    includeReading: boolean,
  ): Promise<TranslationResult | null> {
    if (!missing.length) return null;
    const targetLang = this.settings.get(OptionKey.TranslationTargetLang) as TranslationLang;
    const targetName = LANG_NAMES[targetLang];
    const sourceName = SOURCE_LANG_NAMES[lang] ?? lang;
    const format = includeReading ? `N|${targetName}|reading` : `N|${targetName}`;
    const numbered = missing.map((m) => `${m.idx}|${m.text}`).join('\n');

    const prompt = `Translate ${sourceName} lyrics to ${targetName}. Only the ${missing.length} missing lines. ${format} format only. Keep line numbers.\n\n${numbered}`;

    try {
      const result = await this.geminiModel!.generateContent(prompt);
      const text = result.response.text();
      this.dailyCount++;
      return this.parseResponse(text, includeReading);
    } catch (e) {
      this.logger.warn(`Gemini partial error: ${(e as Error).message}`);
      return null;
    }
  }

  // ─── Response Parsing (강화) ───────────────────────────

  private parseResponse(text: string, includeReading: boolean): TranslationResult {
    const translations = new Map<number, string>();
    const readings = new Map<number, string>();

    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line) continue;

      if (includeReading) {
        const m = LINE_WITH_READING.exec(line);
        if (m) {
          translations.set(Number(m[1]), m[2].trim());
          readings.set(Number(m[1]), m[3].trim());
          continue;
        }
      }

      const m2 = LINE_TRANSLATION.exec(line);
      if (m2) translations.set(Number(m2[1]), m2[2].trim());
    }

    return { translations, readings };
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

  private checkDailyLimit(): boolean {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.lastResetDate) {
      this.dailyCount = 0;
      this.lastResetDate = today;
    }
    const limit = this.settings.getNumber(OptionKey.TranslationDailyLimit);
    return this.dailyCount < limit;
  }
}
