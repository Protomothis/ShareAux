import { Injectable, Logger } from '@nestjs/common';

import { AUTODJ_MAX_DURATION_SEC, AUTODJ_MIN_DURATION_SEC } from '../constants.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

const AI_DJ_HISTORY_DEPTH = 10;

import { PlayHistory } from '../entities/play-history.entity.js';
import { Room } from '../entities/room.entity.js';
import { Track } from '../entities/track.entity.js';
import type { AutoDjTags } from '../types/index.js';
import { Provider } from '../types/provider.enum.js';
import { OptionKey } from '../types/settings.types.js';
import { ChartService } from './chart.service.js';
import { SettingsService } from './settings.service.js';
import { type YtdlpSearchResult, YtdlpService } from './ytdlp.service.js';

export interface AiPoolResult {
  tracks: Track[];
  usedSourceIds: string[];
}

const GENRE_PROMPT: Record<string, string> = {
  indie: 'indie/alternative',
  pop: 'pop',
  hiphop: 'hip-hop/rap',
  rnb: 'R&B/soul',
  rock: 'rock',
  electronic: 'electronic/EDM',
  jazz: 'jazz',
  classical: 'classical/orchestral',
  anime: 'anime soundtrack (opening, ending, insert songs)',
  game: 'video game soundtrack (OST, boss themes)',
  lofi: 'lo-fi hip-hop/chill beats',
  metal: 'metal/hard rock',
  soul: 'soul/funk/motown',
  reggae: 'reggae/ska',
  folk: 'folk/acoustic/singer-songwriter',
};

const MOOD_PROMPT: Record<string, string> = {
  calm: 'calm/peaceful',
  upbeat: 'upbeat/happy',
  emotional: 'emotional/touching',
  dreamy: 'dreamy/atmospheric',
  energetic: 'energetic/high-energy',
  dark: 'dark/intense',
  chill: 'chill/laid-back',
  melancholy: 'melancholy/sad',
  epic: 'epic/cinematic/grandiose',
  romantic: 'romantic/love songs',
  nostalgic: 'nostalgic/retro feel',
};

const COUNTRY_PROMPT: Record<string, string> = {
  kr: 'Korean (K-pop, K-indie, K-R&B)',
  jp: 'Japanese (J-pop, J-rock, city pop)',
  us: 'American',
  gb: 'British',
  fr: 'French (chanson, French pop)',
  br: 'Brazilian (bossa nova, MPB, sertanejo)',
  es: 'Spanish/Latin (reggaeton, Latin pop)',
  se: 'Swedish (Scandinavian pop)',
  cn: 'Chinese (C-pop, Mandopop)',
  au: 'Australian (Aussie indie, electronic)',
  in: 'Indian (Bollywood, Indian indie)',
};

const TASTE_PROMPT: Record<string, string> = {
  mainstream: 'well-known popular hits and chart songs',
  underground: 'underground, lesser-known, hidden gems',
};

const BATCH_CONCURRENCY = 5;
const TITLE_BLACKLIST = /live|cover|tutorial|lesson|karaoke|instrumental|remix|compilation/i;

@Injectable()
export class AiDjGeminiService {
  private readonly logger = new Logger(AiDjGeminiService.name);

  constructor(
    @InjectRepository(PlayHistory) private readonly historyRepo: Repository<PlayHistory>,
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    private readonly ytdlp: YtdlpService,
    private readonly settings: SettingsService,
    private readonly chartService: ChartService,
  ) {}

  async generate(roomId: string, room: Room, batchSize: number, usedSourceIds: Set<string>): Promise<AiPoolResult> {
    const apiKey = this.settings.getSecret(OptionKey.GeminiApiKey);
    if (!apiKey) {
      this.logger.warn('[AI DJ] Gemini API key not configured');
      return { tracks: [], usedSourceIds: [] };
    }

    const prompt = await this.buildPrompt(roomId, room, batchSize);
    const lines = await this.callGemini(apiKey, prompt);
    return this.searchAndUpsert(lines, batchSize, usedSourceIds);
  }

  private async buildPrompt(roomId: string, room: Room, batchSize: number): Promise<string> {
    const recentHistory = await this.historyRepo.find({
      where: { room: { id: roomId } },
      order: { playedAt: 'DESC' },
      take: AI_DJ_HISTORY_DEPTH,
    });
    const recentTracks = recentHistory.length
      ? await this.trackRepo.find({ where: recentHistory.map((h) => ({ sourceId: h.sourceId })) })
      : [];

    const context = recentTracks.map((t) => `${t.artist ?? 'Unknown'} - ${t.name}`).join('\n');
    const recentArtists = [...new Set(recentTracks.map((t) => t.artist).filter(Boolean))];
    const tags: AutoDjTags = room.autoDjTags ?? { mood: [], genre: [], era: [], country: [] };

    const toLabel = (values: string[], map: Record<string, string>) => values.map((v) => map[v] ?? v).join(', ');
    const tagLines: string[] = [];
    if (tags.mood.length) tagLines.push(`- Mood MUST be: ${toLabel(tags.mood, MOOD_PROMPT)}`);
    if (tags.genre.length) tagLines.push(`- Genre MUST be: ${toLabel(tags.genre, GENRE_PROMPT)}`);
    if (tags.era.length) tagLines.push(`- Era: ${tags.era.join(', ')}`);
    if (tags.country.length) tagLines.push(`- Country/origin: ${toLabel(tags.country, COUNTRY_PROMPT)}`);
    if (tags.taste && tags.taste !== 'neutral') tagLines.push(`- Taste: ${TASTE_PROMPT[tags.taste] ?? ''}`);
    const userPrompt = room.autoDjPrompt ?? '';

    // 차트 few-shot: 태그 장르와 매칭되는 인기곡 예시
    const matchingGenres = tags.genre.length ? tags.genre : ['pop', 'kpop'];
    const chartExamples = await this.chartService.getByGenres(matchingGenres, 5);
    const chartSection = chartExamples.length
      ? `\nPopular songs matching your criteria (for reference, style guide):\n${chartExamples.map((t) => `${t.artist} - ${t.title}`).join('\n')}`
      : '';

    return [
      'You are an expert music curator. Recommend songs that STRICTLY match ALL conditions below.',
      '',
      'Rules:',
      '- Only real, officially released songs (if unsure, exclude)',
      '- Maximum 1 song per artist',
      recentArtists.length ? `- Exclude these artists: ${recentArtists.join(', ')}` : '',
      '- No covers, live versions, remixes, instrumentals, tutorials, or compilations',
      '- Duration: 1~7 minutes',
      '- Pick from diverse artists, eras, and regions',
      '',
      recentTracks.length ? `Recently played (for context, do NOT repeat):\n${context}` : '',
      chartSection,
      tagLines.length ? `\nRequired conditions (every song must match):\n${tagLines.join('\n')}` : '',
      userPrompt ? `\nAdditional request: ${userPrompt}` : '',
      '',
      `Output exactly ${batchSize} songs in "Artist - Title" format, one per line. Nothing else.`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async callGemini(apiKey: string, prompt: string): Promise<string[]> {
    const temperature = parseFloat(this.settings.get(OptionKey.AutoDjTemperature, '0.8'));
    const model = this.settings.get(OptionKey.AutoDjAiModel, 'gemini-2.5-flash-lite');

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const gemini = genAI.getGenerativeModel({ model, generationConfig: { temperature } });
    const result = await gemini.generateContent(prompt);
    const text = result.response.text();

    return text
      .split('\n')
      .map((l) => l.replace(/^\d+[.)]\s*/, '').trim())
      .filter((l) => l.includes(' - ') || l.includes(' – '));
  }

  private async searchAndUpsert(lines: string[], batchSize: number, usedSourceIds: Set<string>): Promise<AiPoolResult> {
    const tracks: Track[] = [];
    const newUsedIds: string[] = [];

    for (let i = 0; i < lines.length && tracks.length < batchSize; i += BATCH_CONCURRENCY) {
      const batch = lines.slice(i, i + BATCH_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (line) => {
          const res = await this.ytdlp.searchInnertube(line);
          const match = res.results.find(
            (sr) =>
              sr.duration >= AUTODJ_MIN_DURATION_SEC &&
              sr.duration <= AUTODJ_MAX_DURATION_SEC &&
              !TITLE_BLACKLIST.test(sr.title) &&
              !usedSourceIds.has(sr.id),
          );
          return match ? this.upsertTrack(match) : null;
        }),
      );
      for (const r of results) {
        if (tracks.length >= batchSize) break;
        if (r.status !== 'fulfilled' || !r.value) continue;
        const track = r.value;
        if (tracks.some((t) => t.id === track.id)) continue;
        tracks.push(track);
        newUsedIds.push(track.sourceId);
      }
    }

    return { tracks, usedSourceIds: newUsedIds };
  }

  private async upsertTrack(r: YtdlpSearchResult): Promise<Track> {
    const existing = await this.trackRepo.findOneBy({ sourceId: r.id });
    if (existing) return existing;
    return this.trackRepo.save(
      this.trackRepo.create({
        provider: Provider.YT,
        sourceId: r.id,
        name: r.title,
        artist: r.artist,
        thumbnail: r.thumbnail,
        durationMs: r.duration * 1000,
        fetchedAt: new Date(),
      }),
    );
  }
}
