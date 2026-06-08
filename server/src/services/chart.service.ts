import type { OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DEFAULT_CHART_PLAYLISTS } from '../constants.js';
import { ChartTrack } from '../entities/chart-track.entity.js';
import type { ChartPlaylistEntry } from '../types/index.js';
import { OptionKey } from '../types/index.js';
import { YtdlpService } from './ytdlp.service.js';
import { SettingsService } from './settings.service.js';

const CHART_SHOWCASE_LIMIT = 20;

export interface ChartCategory {
  genre: string;
  label: string;
  emoji: string;
  tracks: ChartTrack[];
}

@Injectable()
export class ChartService implements OnModuleInit {
  private readonly logger = new Logger(ChartService.name);
  private lastFetchDate: string | null = null;

  constructor(
    @InjectRepository(ChartTrack) private readonly chartRepo: Repository<ChartTrack>,
    private readonly ytdlp: YtdlpService,
    private readonly settings: SettingsService,
  ) {}

  /** 서버 시작 시 차트 데이터가 비어있으면 즉시 수집 */
  async onModuleInit(): Promise<void> {
    if (!this.settings.getBoolean(OptionKey.ChartEnabled, true)) return;
    const count = await this.chartRepo.count();
    if (count === 0) {
      this.logger.log('[Chart] 데이터 없음 — 초기 수집 시작');
      void this.fetchAll();
    }
  }

  /** 매 시간 체크 — 설정된 시각이면 수집 */
  @Cron(CronExpression.EVERY_HOUR)
  async onCron(): Promise<void> {
    if (!this.settings.getBoolean(OptionKey.ChartEnabled, true)) return;

    const targetHour = this.settings.getNumber(OptionKey.ChartFetchHour, 4);
    const now = new Date();
    if (now.getHours() !== targetHour) return;

    const today = now.toISOString().slice(0, 10);
    if (this.lastFetchDate === today) return;

    this.lastFetchDate = today;
    await this.fetchAll();
  }

  /** 전체 플레이리스트 수집 */
  async fetchAll(): Promise<void> {
    const playlists = this.getPlaylists();
    this.logger.log(`[Chart] 수집 시작 — ${playlists.length}개 플레이리스트`);

    let successCount = 0;
    for (const entry of playlists) {
      try {
        await this.fetchPlaylist(entry);
        successCount++;
      } catch (e) {
        this.logger.warn(`[Chart] 플레이리스트 실패: ${entry.label} (${entry.id})`, e instanceof Error ? e.message : e);
      }
    }

    this.logger.log(`[Chart] 수집 완료 — ${successCount}/${playlists.length} 성공`);
  }

  /** 단일 플레이리스트 fetch + upsert */
  private async fetchPlaylist(entry: ChartPlaylistEntry): Promise<void> {
    const tracks = await this.ytdlp.getPlaylistTracks(entry.id);
    if (!tracks.length) {
      this.logger.warn(`[Chart] 빈 플레이리스트: ${entry.label} (${entry.id})`);
      return;
    }

    const now = new Date();

    // 기존 데이터 삭제 후 새로 삽입 (순위 변동 반영)
    await this.chartRepo.delete({ playlistId: entry.id });

    const entities = tracks.slice(0, 100).map((t, idx) =>
      this.chartRepo.create({
        sourceId: t.id,
        title: t.title,
        artist: t.artist,
        thumbnail: t.thumbnail,
        playlistId: entry.id,
        genre: entry.genre,
        country: entry.country,
        rank: idx + 1,
        fetchedAt: now,
      }),
    );

    await this.chartRepo.save(entities);
    this.logger.debug(`[Chart] ${entry.label}: ${entities.length}곡 저장`);
  }

  /** 장르별 차트 트랙 조회 */
  async getByGenre(genre: string, limit = 30): Promise<ChartTrack[]> {
    return this.chartRepo.find({
      where: { genre },
      order: { rank: 'ASC' },
      take: limit,
    });
  }

  /** 장르 목록에 해당하는 차트 트랙 조회 (AI DJ용) */
  async getByGenres(genres: string[], limit = 5): Promise<ChartTrack[]> {
    if (!genres.length) return [];
    return this.chartRepo
      .createQueryBuilder('ct')
      .where('ct.genre IN (:...genres)', { genres })
      .orderBy('ct.rank', 'ASC')
      .take(limit)
      .getMany();
  }

  /** 전체 카테고리별 요약 (쇼케이스용) */
  async getCategories(): Promise<ChartCategory[]> {
    const playlists = this.getPlaylists();
    const categories: ChartCategory[] = [];

    for (const entry of playlists) {
      const tracks = await this.chartRepo.find({
        where: { playlistId: entry.id },
        order: { rank: 'ASC' },
        take: CHART_SHOWCASE_LIMIT,
      });
      categories.push({ genre: entry.genre, label: entry.label, emoji: entry.emoji, tracks });
    }

    return categories;
  }

  /** 설정에서 플레이리스트 목록 로드 */
  private getPlaylists(): ChartPlaylistEntry[] {
    try {
      const raw = this.settings.get(OptionKey.ChartPlaylists, '');
      if (!raw) return DEFAULT_CHART_PLAYLISTS;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_CHART_PLAYLISTS;
      return parsed.filter(
        (item): item is ChartPlaylistEntry =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Record<string, unknown>).id === 'string' &&
          typeof (item as Record<string, unknown>).genre === 'string' &&
          typeof (item as Record<string, unknown>).label === 'string' &&
          typeof (item as Record<string, unknown>).emoji === 'string',
      );
    } catch {
      this.logger.warn('[Chart] chart.playlists 설정 파싱 실패');
      return DEFAULT_CHART_PLAYLISTS;
    }
  }
}
