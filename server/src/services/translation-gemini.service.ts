import type { GenerativeModel } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';

import { OptionKey } from '../types/settings.types.js';
import { TranslationLang } from '../types/translation-lang.enum.js';
import { SettingsService } from './settings.service.js';

// ─── Types ───────────────────────────────────────────────

export interface ParsedLine {
  time: string;
  text: string;
}

export interface TranslationResult {
  translations: Map<number, string>;
  readings: Map<number, string>;
}

// ─── Constants ───────────────────────────────────────────

const CHUNK_SIZE = 40;
const CONTEXT_OVERLAP = 10;
/** 구분자: 유니코드 BOX DRAWINGS LIGHT VERTICAL (│ U+2502) */
const SEP = '│';
/** 파싱: N│번역│발음 */
const LINE_WITH_READING = /^\s*(\d+)\s*│\s*([^│]*?)\s*│\s*(.*?)\s*$/;
const LINE_TRANSLATION = /^\s*(\d+)\s*│\s*(.+?)\s*$/;
/** 폴백: 파이프, 탭, 슬래시, 마침표+공백, 괄호 구분자도 허용 */
const LINE_WITH_READING_FALLBACK = /^\s*(\d+)\s*[|/\t.)]\s*([^|/\t]*?)\s*[|/\t]\s*(.+?)\s*$/;
const LINE_TRANSLATION_FALLBACK = /^\s*(\d+)\s*[|/\t.)]\s*(.+?)\s*$/;

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

const STYLE_GUIDE: Record<TranslationLang, string> = {
  [TranslationLang.Ko]: '반말 서술체 (해체). 자연스러운 한국어 가사체. 예: "너를 사랑해", "떠나지 마"',
  [TranslationLang.En]: 'Casual, poetic English. Natural song lyrics tone. e.g. "I love you", "don\'t go"',
  [TranslationLang.Ja]: 'カジュアルな歌詞体。例：「愛してる」「行かないで」',
  [TranslationLang.Zh]: '口语化歌词体。例："我爱你"、"别走"',
  [TranslationLang.ZhTW]: '口語化歌詞體。例：「我愛你」、「別走」',
  [TranslationLang.Es]: 'Tono lírico casual. Ejemplo: "te amo", "no te vayas"',
  [TranslationLang.Fr]: "Ton lyrique décontracté. Exemple : « je t'aime », « ne pars pas »",
  [TranslationLang.De]: 'Lockerer Liedtext-Ton. Beispiel: „Ich liebe dich", „Geh nicht"',
  [TranslationLang.Pt]: 'Tom lírico casual. Exemplo: "eu te amo", "não vá"',
  [TranslationLang.Th]: 'น้ำเสียงเนื้อเพลงแบบสบายๆ',
  [TranslationLang.Vi]: 'Giọng lời bài hát tự nhiên',
  [TranslationLang.Id]: 'Nada lirik lagu yang santai dan natural',
};

const FEW_SHOT: Record<string, string> = {
  'ja→ko': `1│夜に駆ける│요루니 카케루
2│沈むように溶けてゆくように│시즈무요우니 토케테유쿠요우니
3│二人だけの空が広がる夜に│후타리다케노 소라가 히로가루 요루니

→

1│밤을 달려│요루니 카케루
2│가라앉듯이 녹아가듯이│시즈무요우니 토케테유쿠요우니
3│둘만의 하늘이 펼쳐지는 밤에│후타리다케노 소라가 히로가루 요루니`,

  'ja→en': `1│夜に駆ける│yoru ni kakeru
2│沈むように溶けてゆくように│shizumu you ni tokete yuku you ni

→

1│Racing into the night│yoru ni kakeru
2│As if sinking, as if melting away│shizumu you ni tokete yuku you ni`,

  'en→ko': `1│I don't wanna live forever
2│'Cause I know I'll be living in vain

→

1│영원히 살고 싶지 않아
2│헛되이 살게 될 걸 아니까`,

  'zh→ko': `1│我们一起学猫叫
2│一起喵喵喵喵喵

→

1│우리 같이 고양이 울음 배우자
2│같이 야옹야옹야옹야옹야옹`,
};

@Injectable()
export class TranslationGeminiService {
  private readonly logger = new Logger(TranslationGeminiService.name);
  private geminiModel: GenerativeModel | null = null;
  dailyCount = 0;
  private lastResetDate = '';

  constructor(private readonly settings: SettingsService) {}

  // ─── Init ──────────────────────────────────────────────

  async initGemini(): Promise<void> {
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

  get isReady(): boolean {
    return !!this.geminiModel;
  }

  async reinitialize(): Promise<void> {
    this.geminiModel = null;
    await this.initGemini();
  }

  // ─── Daily Limit ───────────────────────────────────────

  checkDailyLimit(): boolean {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.lastResetDate) {
      this.dailyCount = 0;
      this.lastResetDate = today;
    }
    const limit = this.settings.getNumber(OptionKey.TranslationDailyLimit);
    return this.dailyCount < limit;
  }

  // ─── Chunk Translation ─────────────────────────────────

  async translateWithChunks(
    lines: ParsedLine[],
    lang: string,
    targetLang: TranslationLang,
    includeReading: boolean,
  ): Promise<TranslationResult | null> {
    if (lines.length <= CHUNK_SIZE) {
      return this.callGemini(lines, 0, lang, targetLang, includeReading, [], null);
    }

    const translations = new Map<number, string>();
    const readings = new Map<number, string>();
    let prevTranslated: string[] = [];

    for (let offset = 0; offset < lines.length; offset += CHUNK_SIZE) {
      const chunk = lines.slice(offset, offset + CHUNK_SIZE);
      const context = offset > 0 ? lines.slice(Math.max(0, offset - CONTEXT_OVERLAP), offset) : [];
      const result = await this.callGemini(chunk, offset, lang, targetLang, includeReading, context, prevTranslated);
      if (!result) continue;
      for (const [k, v] of result.translations) translations.set(k, v);
      for (const [k, v] of result.readings) readings.set(k, v);

      const lastKeys = [...result.translations.keys()].sort((a, b) => a - b).slice(-5);
      prevTranslated = lastKeys.map((k) => result.translations.get(k) ?? '');
    }

    // 누락 보충 (1회)
    const missing = lines.map((l, i) => ({ idx: i + 1, text: l.text })).filter((m) => !translations.has(m.idx));

    if (missing.length > 0 && missing.length <= lines.length * 0.3) {
      const partial = await this.callGeminiPartial(missing, lines, translations, lang, targetLang, includeReading);
      if (partial) {
        for (const [k, v] of partial.translations) translations.set(k, v);
        for (const [k, v] of partial.readings) readings.set(k, v);
      }
    }

    return { translations, readings };
  }

  // ─── Gemini API Calls ──────────────────────────────────

  private buildSystemInstruction(lang: string, targetLang: TranslationLang, includeReading: boolean): string {
    const targetName = LANG_NAMES[targetLang];
    const style = STYLE_GUIDE[targetLang];

    const readingDesc =
      targetLang === TranslationLang.Ko
        ? `- reading column is MANDATORY — never leave it empty or omit it.
- reading = 원문의 한글 발음 표기 (예: 夜に駆ける → 요루니 카케루)
- Every single line MUST have all 3 columns: N│translation│reading
- If unsure, write your best phonetic approximation in Korean`
        : `- reading column is MANDATORY — never leave it empty or omit it.
- reading = romanized pronunciation of the ORIGINAL text (e.g. 夜に駆ける → yoru ni kakeru)
- Every single line MUST have all 3 columns: N│translation│reading
- If unsure, write your best phonetic approximation`;

    return `You are a professional song lyrics translator.

Your task: Translate song lyrics to ${targetName}.

Style: ${style}

Critical rules:
- Maintain the SAME tone and style throughout the entire song. Never switch between formal/informal.
- Translate meaning faithfully. Prioritize meaning over rhyme.
- Keep interjections untranslated: oh, yeah, la la, na na, ah, uh, hmm, wow
- Keep proper nouns (names, places) in original form
- Never add explanations, notes, or commentary
- Output format: N${SEP}translation${includeReading ? `${SEP}reading` : ''}
- N = line number. Must match exactly.${includeReading ? `\n${readingDesc}` : ''}`;
  }

  private buildFewShot(lang: string, targetLang: TranslationLang): string {
    const key = `${lang}→${targetLang}`;
    const example = FEW_SHOT[key];
    if (!example) return '';
    return `\nExample:\n${example}\n`;
  }

  private async callGemini(
    lines: ParsedLine[],
    offset: number,
    lang: string,
    targetLang: TranslationLang,
    includeReading: boolean,
    context: ParsedLine[],
    prevTranslated: string[] | null,
  ): Promise<TranslationResult | null> {
    const numbered = lines.map((l, i) => `${offset + i + 1}${SEP}${l.text}`).join('\n');
    const targetName = LANG_NAMES[targetLang];

    let userPrompt = '';

    if (context.length > 0) {
      userPrompt += `[Context — preceding lyrics, do NOT translate]\n${context.map((l) => l.text).join('\n')}\n\n`;
    }

    if (prevTranslated?.length) {
      userPrompt += `[Previous translations — match this tone]\n${prevTranslated.join('\n')}\n\n`;
    }

    userPrompt += `Translate these ${lines.length} lines to ${targetName}. Output exactly ${lines.length} lines.\n\n${numbered}`;

    const fewShot = this.buildFewShot(lang, targetLang);
    if (fewShot) userPrompt = fewShot + '\n' + userPrompt;

    try {
      const result = await this.geminiModel!.generateContent({
        systemInstruction: this.buildSystemInstruction(lang, targetLang, includeReading),
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      });
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
    allLines: ParsedLine[],
    existingTranslations: Map<number, string>,
    lang: string,
    targetLang: TranslationLang,
    includeReading: boolean,
  ): Promise<TranslationResult | null> {
    if (!missing.length) return null;
    const targetName = LANG_NAMES[targetLang];

    const contextLines: string[] = [];
    for (const m of missing.slice(0, 5)) {
      for (let d = -2; d <= 2; d++) {
        const neighborIdx = m.idx + d;
        if (d === 0) continue;
        const trans = existingTranslations.get(neighborIdx);
        const orig = allLines[neighborIdx - 1]?.text;
        if (trans && orig) contextLines.push(`${neighborIdx}${SEP}${orig} → ${trans}`);
      }
    }
    const uniqueContext = [...new Set(contextLines)].sort().slice(0, 10);

    const numbered = missing.map((m) => `${m.idx}${SEP}${m.text}`).join('\n');

    const userPrompt = `These ${missing.length} lines were missed. Translate to ${targetName}, matching the tone of surrounding lines.

[Surrounding translations for reference]
${uniqueContext.join('\n')}

[Lines to translate]
${numbered}`;

    try {
      const result = await this.geminiModel!.generateContent({
        systemInstruction: this.buildSystemInstruction(lang, targetLang, includeReading),
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      });
      const text = result.response.text();
      this.dailyCount++;
      return this.parseResponse(text, includeReading);
    } catch (e) {
      this.logger.warn(`Gemini partial error: ${(e as Error).message}`);
      return null;
    }
  }

  // ─── Response Parsing ──────────────────────────────────

  private parseResponse(text: string, includeReading: boolean): TranslationResult {
    const translations = new Map<number, string>();
    const readings = new Map<number, string>();

    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('[') || line.startsWith('→')) continue;

      if (includeReading) {
        const m = LINE_WITH_READING.exec(line) ?? LINE_WITH_READING_FALLBACK.exec(line);
        if (m) {
          const num = Number(m[1]);
          const trans = m[2].trim();
          const reading = m[3].trim();
          if (trans) translations.set(num, trans);
          if (reading) readings.set(num, reading);
          continue;
        }
      }

      const m2 = LINE_TRANSLATION.exec(line) ?? LINE_TRANSLATION_FALLBACK.exec(line);
      if (m2) {
        const num = Number(m2[1]);
        const trans = m2[2].trim().replace(/[│|/]\s*$/, '');
        if (trans) translations.set(num, trans);
      }
    }

    return { translations, readings };
  }
}
