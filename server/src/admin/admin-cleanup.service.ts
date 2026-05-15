import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import {
  ADMIN_INACTIVE_CUTOFF_MS,
  HISTORY_MAX_PER_ROOM,
  QUEUE_PLAYED_RETENTION_DAYS,
  TRACK_UNUSED_DAYS,
} from '../constants.js';
import { PlayHistory } from '../entities/play-history.entity.js';
import { Room } from '../entities/room.entity.js';
import { RoomQueue } from '../entities/room-queue.entity.js';
import { Track } from '../entities/track.entity.js';
import { TrackStats } from '../entities/track-stats.entity.js';
import { TrackVote } from '../entities/track-vote.entity.js';
import { User } from '../entities/user.entity.js';
import { LyricsStatus, UserRole } from '../types/index.js';
import type { CleanupSummaryResponse } from './dto/cleanup-summary-response.dto.js';

@Injectable()
export class AdminCleanupService {
  private readonly logger = new Logger(AdminCleanupService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    @InjectRepository(TrackStats) private readonly trackStatsRepo: Repository<TrackStats>,
    @InjectRepository(TrackVote) private readonly voteRepo: Repository<TrackVote>,
    @InjectRepository(RoomQueue) private readonly queueRepo: Repository<RoomQueue>,
    @InjectRepository(PlayHistory) private readonly playHistoryRepo: Repository<PlayHistory>,
  ) {}

  async getCleanupSummary(): Promise<CleanupSummaryResponse> {
    const now = Date.now();
    const d30 = new Date(now - 30 * 86_400_000);
    const d7 = new Date(now - 7 * 86_400_000);
    const guestCutoff = new Date(now - ADMIN_INACTIVE_CUTOFF_MS);

    const [
      totalTracks,
      totalPlayHistories,
      activeRooms,
      inactiveRooms,
      totalUsers,
      guestUsers,
      lyricsFoundTracks,
      totalQueueItems,
      unplayedTracks,
      staleTracksCount,
      oldHistories30d,
      inactiveRooms7d,
      emptyInactiveRooms,
      expiredGuests,
      inactiveGuests30d,
      tableSizesRaw,
    ] = await Promise.all([
      this.trackRepo.count(),
      this.playHistoryRepo.count(),
      this.roomRepo.count({ where: { isActive: true } }),
      this.roomRepo.count({ where: { isActive: false } }),
      this.userRepo.count(),
      this.userRepo.count({ where: { role: UserRole.Guest } }),
      this.trackRepo.count({ where: { lyricsStatus: LyricsStatus.Found } }),
      this.queueRepo.count(),
      this.trackRepo
        .createQueryBuilder('t')
        .where('t.source_id NOT IN (SELECT DISTINCT source_id FROM play_histories)')
        .getCount(),
      this.trackRepo
        .createQueryBuilder('t')
        .innerJoin('track_stats', 'ts', 'ts.track_id = t.id')
        .where('ts.last_played_at < :d30', { d30 })
        .getCount(),
      this.playHistoryRepo.createQueryBuilder('h').where('h.played_at < :d30', { d30 }).getCount(),
      this.roomRepo.createQueryBuilder('r').where('r.is_active = false AND r.created_at < :d7', { d7 }).getCount(),
      this.roomRepo
        .createQueryBuilder('r')
        .where('r.is_active = false')
        .andWhere('r.id NOT IN (SELECT DISTINCT room_id FROM room_queues)')
        .getCount(),
      this.userRepo.count({ where: { role: UserRole.Guest, createdAt: LessThan(guestCutoff) } }),
      this.userRepo.count({ where: { role: UserRole.Guest, createdAt: LessThan(d30) } }),
      this.playHistoryRepo.manager.query<{ name: string; sizeMB: number }[]>(
        `SELECT relname AS name,
                ROUND(pg_total_relation_size(c.oid) / 1048576.0, 2)::float AS "sizeMB"
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind = 'r'
         ORDER BY pg_total_relation_size(c.oid) DESC`,
      ),
    ]);

    return {
      totalTracks,
      totalPlayHistories,
      activeRooms,
      inactiveRooms,
      totalUsers,
      guestUsers,
      lyricsFoundTracks,
      totalQueueItems,
      unplayedTracks,
      staleTracksCount,
      oldHistories30d,
      inactiveRooms7d,
      emptyInactiveRooms,
      expiredGuests,
      inactiveGuests30d,
      tableSizes: tableSizesRaw,
    };
  }

  async cleanupUnplayedTracks(): Promise<number> {
    const tracks = await this.trackRepo
      .createQueryBuilder('t')
      .where('t.source_id NOT IN (SELECT DISTINCT source_id FROM play_histories)')
      .andWhere('t.id NOT IN (SELECT DISTINCT track_id FROM user_favorites)')
      .getMany();
    if (!tracks.length) return 0;
    return this.deleteTracks(tracks.map((t) => t.id));
  }

  async cleanupStaleTracks(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const tracks = await this.trackRepo
      .createQueryBuilder('t')
      .innerJoin('track_stats', 'ts', 'ts.track_id = t.id')
      .where('ts.last_played_at < :cutoff', { cutoff })
      .andWhere('t.id NOT IN (SELECT DISTINCT track_id FROM user_favorites)')
      .getMany();
    if (!tracks.length) return 0;
    return this.deleteTracks(tracks.map((t) => t.id));
  }

  async cleanupOldHistories(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const { affected } = await this.playHistoryRepo
      .createQueryBuilder()
      .delete()
      .where('played_at < :cutoff', { cutoff })
      .execute();
    return affected ?? 0;
  }

  async cleanupInactiveRooms(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const { affected } = await this.roomRepo
      .createQueryBuilder()
      .delete()
      .where('is_active = false AND created_at < :cutoff', { cutoff })
      .execute();
    return affected ?? 0;
  }

  async cleanupEmptyInactiveRooms(): Promise<number> {
    const { affected } = await this.roomRepo
      .createQueryBuilder()
      .delete()
      .where('is_active = false')
      .andWhere('id NOT IN (SELECT DISTINCT room_id FROM room_queues)')
      .execute();
    return affected ?? 0;
  }

  async cleanupExpiredGuests(): Promise<number> {
    const cutoff = new Date(Date.now() - ADMIN_INACTIVE_CUTOFF_MS);
    const { affected } = await this.userRepo.delete({ role: UserRole.Guest, createdAt: LessThan(cutoff) });
    return affected ?? 0;
  }

  async cleanupInactiveGuests(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const { affected } = await this.userRepo.delete({ role: UserRole.Guest, createdAt: LessThan(cutoff) });
    return affected ?? 0;
  }

  async deleteExpiredGuests() {
    const cutoff = new Date(Date.now() - ADMIN_INACTIVE_CUTOFF_MS);
    const { affected } = await this.userRepo.delete({ role: UserRole.Guest, createdAt: LessThan(cutoff) });
    return { deleted: affected ?? 0 };
  }

  private async deleteTracks(trackIds: string[]): Promise<number> {
    await this.voteRepo.createQueryBuilder().delete().where('track_id IN (:...trackIds)', { trackIds }).execute();
    await this.trackStatsRepo.createQueryBuilder().delete().where('track_id IN (:...trackIds)', { trackIds }).execute();
    await this.queueRepo
      .createQueryBuilder()
      .update()
      .set({ track: null as unknown as Track })
      .where('track_id IN (:...trackIds)', { trackIds })
      .execute();
    const { affected } = await this.trackRepo
      .createQueryBuilder()
      .delete()
      .where('id IN (:...trackIds)', { trackIds })
      .execute();
    return affected ?? 0;
  }

  // --- Cron ---

  @Cron(CronExpression.EVERY_HOUR)
  async handleGuestCleanup() {
    const { deleted } = await this.deleteExpiredGuests();
    if (deleted > 0) this.logger.log(`만료된 게스트 ${deleted}명 자동 삭제`);
  }

  /** 매일 새벽 4시: 오래된 데이터 정리 */
  @Cron('0 4 * * *')
  async handleDataRetention() {
    const rooms = await this.roomRepo.find({ select: ['id'] });
    let historyDeleted = 0;
    for (const room of rooms) {
      const overflow = await this.playHistoryRepo
        .createQueryBuilder('h')
        .where('h.room_id = :roomId', { roomId: room.id })
        .orderBy('h.playedAt', 'DESC')
        .skip(HISTORY_MAX_PER_ROOM)
        .getMany();
      if (overflow.length) {
        await this.playHistoryRepo.remove(overflow);
        historyDeleted += overflow.length;
      }
    }

    const queueCutoff = new Date(Date.now() - QUEUE_PLAYED_RETENTION_DAYS * 86_400_000);
    const queueResult = await this.queueRepo
      .createQueryBuilder()
      .delete()
      .where('played = true AND added_at < :cutoff', { cutoff: queueCutoff })
      .execute();

    const trackCutoff = new Date(Date.now() - TRACK_UNUSED_DAYS * 86_400_000);
    const trackResult = await this.trackRepo
      .createQueryBuilder('t')
      .delete()
      .where('t.fetched_at < :cutoff', { cutoff: trackCutoff })
      .andWhere('t.source_id NOT IN (SELECT DISTINCT source_id FROM play_histories WHERE played_at > :cutoff)', {
        cutoff: trackCutoff,
      })
      .andWhere('t.id NOT IN (SELECT DISTINCT track_id FROM room_queues WHERE played = false)')
      .andWhere('t.id NOT IN (SELECT DISTINCT track_id FROM user_favorites)')
      .execute();

    if (historyDeleted || queueResult.affected || trackResult.affected) {
      this.logger.log(
        `[Retention] history: -${historyDeleted}, queues: -${queueResult.affected ?? 0}, tracks: -${trackResult.affected ?? 0}`,
      );
    }
  }
}
