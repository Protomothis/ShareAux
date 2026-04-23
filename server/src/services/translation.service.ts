import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Track } from '../entities/track.entity.js';
import { SettingsService } from './settings.service.js';
import { OptionKey } from '../types/settings.types.js';

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
import { detectLang } from './detect-lang.js';

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
    private readonly settings: SettingsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const apiKey = this.settings.getSecret(OptionKey.GeminiApiKey);
    if (!apiKey) return;
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = this.settings.get(OptionKey.TranslationModel);
      this.geminiModel = genAI.getGenerativeModel({ model });
      this.logger.log(`Gemini initialized (${model})`);
    } catch (e) {
      this.logger.warn(`Gemini init failed: ${(e as Error).message}`);
    }
  }

  get isEnabled(): boolean {
    return !!this.geminiModel && this.settings.getBoolean(OptionKey.TranslationEnabled);
  }

  /** Gemini 키/모델 변경 시 핫 리로드 */
  async reinitialize(): Promise<void> {
    this.geminiModel = null;
    await this.onModuleInit();
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
      ? `
- 한글발음: 원문 발음을 한글로 표기 (외래어 표기법)
- 영어/기호는 발음란에 원문 그대로 유지
- 한자 읽기는 곡 전체에서 동일 단어는 같은 음독/훈독으로 통일
- 반드시 번역|발음 두 칸 모두 채울 것`
      : '';
    const example = includeReading
      ? '\n예시:\n1|砂を払えば → 1|모래를 털면|스나오 하라에바\n2|I love you → 2|널 사랑해|I love you\n3|La la la → 3|La la la|La la la'
      : '';

    const prompt = `${langName}→한국어 가사 번역.
규칙:
- 정확히 ${lines.length}줄 출력. 절대 생략하지 말 것
- ${format} 형식만 출력. 설명/주석 금지
- 가사체 직역. 의역 최소화
- 감탄사/의성어(oh, yeah, la la 등)는 번역하지 않고 원문 유지
- 영어 가사는 한국어로 번역하되, 발음란에는 영어 원문 유지${readingRule}${example}

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
        this.logger.warn(`Translation incomplete: ${translations.size}/${lines.length}, requesting missing lines`);
        const missing = lines.map((l, i) => ({ idx: i + 1, text: l.text })).filter((m) => !translations.has(m.idx));
        const partial = await this.callGeminiPartial(missing, lang, includeReading);
        if (partial) {
          for (const [k, v] of partial.translations) translations.set(k, v);
          for (const [k, v] of partial.readings) readings.set(k, v);
        }
      }

      return { translations, readings };
    } catch (e) {
      this.logger.error(`Gemini error: ${(e as Error).message}`);
      return null;
    }
  }

  /** 누락된 줄만 보충 번역 요청 */
  private async callGeminiPartial(
    missing: { idx: number; text: string }[],
    lang: string,
    includeReading: boolean,
  ): Promise<{ translations: Map<number, string>; readings: Map<number, string> } | null> {
    if (!missing.length) return null;
    const langName = lang === 'ja' ? '일본어' : lang === 'zh' ? '중국어' : '영어';
    const format = includeReading ? 'N|한국어번역|한글발음' : 'N|한국어번역';
    const numbered = missing.map((m) => `${m.idx}|${m.text}`).join('\n');

    const prompt = `${langName}→한국어 가사 번역. 누락된 ${missing.length}줄만 번역. ${format} 형식만. 번호 유지.\n\n${numbered}`;

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
      return { translations, readings };
    } catch (e) {
      this.logger.warn(`Gemini partial error: ${(e as Error).message}`);
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
    const limit = this.settings.getNumber(OptionKey.TranslationDailyLimit);
    return this.dailyCount < limit;
  }
}
