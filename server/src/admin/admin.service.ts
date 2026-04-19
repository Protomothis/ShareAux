import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { nanoid } from 'nanoid';
import { LessThan, Repository } from 'typeorm';

import {
  ADMIN_INACTIVE_CUTOFF_MS,
  HISTORY_MAX_PER_ROOM,
  QUEUE_PLAYED_RETENTION_DAYS,
  TRACK_UNUSED_DAYS,
} from '../constants.js';

import { AppException } from '../exceptions/app.exception.js';
import { ErrorCode } from '../types/error-code.enum.js';

import { InviteCode } from '../entities/invite-code.entity.js';
import { Report } from '../entities/report.entity.js';
import { Room } from '../entities/room.entity.js';
import { RoomMember } from '../entities/room-member.entity.js';
import { PlayHistory } from '../entities/play-history.entity.js';
import { RoomQueue } from '../entities/room-queue.entity.js';
import { Track } from '../entities/track.entity.js';
import { TrackStats } from '../entities/track-stats.entity.js';
import { TrackVote } from '../entities/track-vote.entity.js';
import { User } from '../entities/user.entity.js';
import { UserTrackHistory } from '../entities/user-track-history.entity.js';
import { RoomPlayback } from '../entities/room-playback.entity.js';
import { AudioService } from '../services/audio.service.js';
import { MetricsService } from '../services/metrics.service.js';
import { PreloadService } from '../services/preload.service.js';
import { Permission, UserRole } from '../types/index.js';
import type { CreateInviteCodeDto } from './dto/create-invite-code.dto.js';
import type { CleanupSummaryResponse } from './dto/cleanup-summary-response.dto.js';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
    @InjectRepository(RoomMember) private readonly memberRepo: Repository<RoomMember>,
    @InjectRepository(InviteCode) private readonly inviteCodeRepo: Repository<InviteCode>,
    @InjectRepository(TrackStats) private readonly trackStatsRepo: Repository<TrackStats>,
    @InjectRepository(PlayHistory) private readonly playHistoryRepo: Repository<PlayHistory>,
    @InjectRepository(UserTrackHistory) private readonly userHistoryRepo: Repository<UserTrackHistory>,
    @InjectRepository(Track) private readonly trackRepo: Repository<Track>,
    @InjectRepository(RoomQueue) private readonly queueRepo: Repository<RoomQueue>,
    @InjectRepository(TrackVote) private readonly voteRepo: Repository<TrackVote>,
    @InjectRepository(Report) private readonly reportRepo: Repository<Report>,
    @InjectRepository(RoomPlayback) private readonly playbackRepo: Repository<RoomPlayback>,
    private readonly audio: AudioService,
    private readonly preload: PreloadService,
    private readonly metrics: MetricsService,
  ) {}

  async getDashboard() {
    const [totalUsers, activeRooms, totalRooms] = await Promise.all([
      this.userRepo.count(),
      this.roomRepo.count({ where: { isActive: true } }),
      this.roomRepo.count(),
    ]);
    return { totalUsers, activeRooms, totalRooms };
  }

  async getUsers(page: number, limit: number, search?: string, role?: string, provider?: string, status?: string) {
    const qb = this.userRepo.createQueryBuilder('u').orderBy('u.createdAt', 'DESC');

    if (search) {
      qb.andWhere('(u.username ILIKE :s OR u.nickname ILIKE :s)', { s: `%${search}%` });
    }
    if (role) {
      qb.andWhere('u.role = :role', { role });
    }
    if (provider) {
      qb.andWhere('u.provider = :provider', { provider });
    }
    if (status === 'banned') {
      qb.andWhere('u.banned_at IS NOT NULL');
    } else if (status === 'active') {
      qb.andWhere('u.banned_at IS NULL');
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async updateUserRole(userId: string, role: UserRole) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new AppException(ErrorCode.ADMIN_002);
    if (user.role === UserRole.SuperAdmin) throw new AppException(ErrorCode.ADMIN_005);
    user.role = role;
    return this.userRepo.save(user);
  }

  async updateAccountPermissions(userId: string, permissions: Permission[]): Promise<void> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new AppException(ErrorCode.ADMIN_002);
    await this.userRepo.update(userId, { accountPermissions: permissions });
  }

  async banUser(userId: string): Promise<void> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new AppException(ErrorCode.ADMIN_002);
    if (user.role === UserRole.SuperAdmin) throw new AppException(ErrorCode.ADMIN_006);
    await this.userRepo.update(userId, { bannedAt: new Date() });
  }

  async unbanUser(userId: string): Promise<void> {
    await this.userRepo.update(userId, { bannedAt: null });
  }

  async getRooms(page: number, limit: number) {
    const [items, total] = await this.roomRepo.findAndCount({
      where: { isActive: true },
      relations: ['host'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const roomIds = items.map((r) => r.id);
    const counts =
      roomIds.length > 0
        ? await this.memberRepo
            .createQueryBuilder('m')
            .select('m.room_id', 'roomId')
            .addSelect('COUNT(*)', 'count')
            .where('m.room_id IN (:...roomIds)', { roomIds })
            .groupBy('m.room_id')
            .getRawMany<{ roomId: string; count: string }>()
        : [];

    const countMap = new Map(counts.map((c) => [c.roomId, Number(c.count)]));
    const roomsWithCount = items.map((room) => ({ ...room, memberCount: countMap.get(room.id) ?? 0 }));

    return { items: roomsWithCount, total, page, limit };
  }

  async deleteRoom(roomId: string) {
    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) throw new AppException(ErrorCode.ROOM_001);
    await this.roomRepo.remove(room);
    return { deleted: true };
  }

  async createInviteCode(dto: CreateInviteCodeDto, userId: string) {
    const permissions = dto.permissions.includes(Permission.Listen)
      ? dto.permissions
      : [Permission.Listen, ...dto.permissions];

    return this.inviteCodeRepo.save(
      this.inviteCodeRepo.create({
        code: dto.code ?? nanoid(8),
        maxUses: dto.maxUses,
        permissions,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy: { id: userId } as User,
      }),
    );
  }

  async getInviteCodes(page: number, limit: number) {
    const [items, total] = await this.inviteCodeRepo.findAndCount({
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async deactivateInviteCode(id: string) {
    const code = await this.inviteCodeRepo.findOneBy({ id });
    if (!code) throw new AppException(ErrorCode.ADMIN_003);
    code.isActive = false;
    return this.inviteCodeRepo.save(code);
  }

  async deleteInviteCode(id: string) {
    const code = await this.inviteCodeRepo.findOneBy({ id });
    if (!code) throw new AppException(ErrorCode.ADMIN_003);
    await this.inviteCodeRepo.remove(code);
    return { success: true };
  }

  async deleteExpiredGuests() {
    const cutoff = new Date(Date.now() - ADMIN_INACTIVE_CUTOFF_MS);
    const { affected } = await this.userRepo.delete({ role: UserRole.Guest, createdAt: LessThan(cutoff) });
    return { deleted: affected ?? 0 };
  }

  // --- 인기 트랙 ---

  async getTopTracks(limit: number) {
    return this.trackStatsRepo.find({
      relations: ['track'],
      order: { score: 'DESC' },
      take: limit,
    });
  }

  // --- 실시간 방 상태 ---

  async getLiveRooms() {
    const activeRoomIds = this.audio.getActiveRooms();
    if (!activeRoomIds.length) return [];

    const rooms = await this.roomRepo.find({
      where: activeRoomIds.map((id) => ({ id })),
      relations: ['host'],
    });

    return rooms.map((room) => {
      const streamInfo = this.audio.getStreamInfo(room.id);
      return {
        id: room.id,
        name: room.name,
        host: room.host?.nickname ?? '',
        codec: streamInfo.codec,
        bitrate: streamInfo.bitrate,
        isStreaming: !!streamInfo.codec,
      };
    });
  }

  // --- 서버 리소스 ---

  getSystemStats() {
    const mem = process.memoryUsage();
    return {
      ffmpegProcesses: this.audio.getActiveRooms().length,
      preloadMemoryMB: Math.round((this.preload.totalMemory / 1024 / 1024) * 10) / 10,
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
      uptimeSec: Math.round(process.uptime()),
    };
  }

  // --- 유저 상세 ---

  async getUserDetail(userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new AppException(ErrorCode.ADMIN_002);

    const [roomCount, trackHistory, totalPlays] = await Promise.all([
      this.memberRepo.count({ where: { user: { id: userId } } }),
      this.userHistoryRepo.find({
        where: { userId },
        relations: ['track'],
        order: { lastPlayedAt: 'DESC' },
        take: 20,
      }),
      this.userHistoryRepo.sum('playCount', { userId }),
    ]);

    return {
      ...user,
      roomCount,
      totalPlays: totalPlays ?? 0,
      recentTracks: trackHistory.map((h) => ({
        trackId: h.trackId,
        name: h.track?.name ?? '',
        playCount: h.playCount,
        lastPlayedAt: h.lastPlayedAt,
      })),
    };
  }

  // --- Metrics ---

  getRealtimeMetrics(since?: number) {
    return { points: this.metrics.getRealtimeMetrics(since) };
  }

  async getDailyPlays(days: number) {
    const items = await this.playHistoryRepo
      .createQueryBuilder('h')
      .select("TO_CHAR(h.played_at, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)::int', 'count')
      .where('h.played_at >= NOW() - CAST(:interval AS interval)', { interval: `${days} days` })
      .groupBy("TO_CHAR(h.played_at, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; count: number }>();
    return { items };
  }

  async getUsersBreakdown() {
    const byProviderRaw = await this.userRepo
      .createQueryBuilder('u')
      .select('u.provider', 'key')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('u.provider')
      .getRawMany<{ key: string; count: number }>();
    const byRoleRaw = await this.userRepo
      .createQueryBuilder('u')
      .select('u.role', 'key')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('u.role')
      .getRawMany<{ key: string; count: number }>();
    const toRecord = (rows: Array<{ key: string; count: number }>) =>
      Object.fromEntries(rows.map((r) => [r.key, r.count]));
    return { byProvider: toRecord(byProviderRaw), byRole: toRecord(byRoleRaw) };
  }

  getStreamingMetrics() {
    return {
      activeStreams: this.audio.getActiveRooms().length,
      totalListeners: this.audio.getTotalListeners(),
      preloadMemoryMB: Math.round((this.preload.totalMemory / 1024 / 1024) * 10) / 10,
      preloadedTracks: this.preload.preloadedCount,
    };
  }

  async getRoomLiveDetail(roomId: string) {
    const room = await this.roomRepo.findOne({ where: { id: roomId }, relations: ['host'] });
    if (!room) throw new AppException(ErrorCode.ROOM_001);

    const [playback, members, queueItems] = await Promise.all([
      this.playbackRepo.findOne({ where: { roomId }, relations: ['track'] }),
      this.memberRepo.find({ where: { roomId }, relations: ['user'] }),
      this.queueRepo.find({
        where: { room: { id: roomId }, played: false },
        relations: ['track', 'addedBy'],
        order: { position: 'ASC' },
        take: 5,
      }),
    ]);

    const streamInfo = this.audio.getStreamInfo(roomId);

    return {
      room: { id: room.id, name: room.name, host: room.host?.nickname ?? '' },
      playback: playback
        ? {
            isPlaying: playback.isPlaying,
            track: playback.track
              ? { id: playback.track.id, name: playback.track.name, artist: playback.track.artist }
              : null,
            positionMs: playback.positionMs,
            startedAt: playback.startedAt,
          }
        : null,
      members: members.map((m) => ({
        userId: m.userId,
        nickname: m.user?.nickname ?? '',
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      queue: queueItems.map((q) => ({
        trackName: q.track?.name ?? '',
        artist: q.track?.artist ?? '',
        addedBy: q.addedBy?.nickname ?? '',
        position: q.position,
      })),
      stream: streamInfo,
    };
  }

  // --- Cleanup ---

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
      this.trackRepo.count({ where: { lyricsStatus: 'found' } }),
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
      this.playHistoryRepo.manager.query<Array<{ name: string; sizeMB: number }>>(
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

  private async deleteTracks(trackIds: string[]): Promise<number> {
    // cascade: votes → stats → nullify queue/history refs → delete tracks
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

  // --- Reports ---

  async getReports(page: number, limit: number, status?: string) {
    const qb = this.reportRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.reporter', 'reporter')
      .orderBy('r.createdAt', 'DESC');
    if (status) qb.where('r.status = :status', { status });
    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      items: items.map((r) => ({ ...r, reporterNickname: r.reporter?.nickname ?? null })),
      total,
    };
  }

  async resolveReport(reportId: string, resolvedByUserId: string, status: string) {
    const report = await this.reportRepo.findOneBy({ id: reportId });
    if (!report) throw new AppException(ErrorCode.ADMIN_004);
    report.status = status;
    report.resolvedBy = resolvedByUserId;
    report.resolvedAt = new Date();
    return this.reportRepo.save(report);
  }

  async createReport(reporterId: string, targetType: string, targetId: string, reason: string, details?: string) {
    return this.reportRepo.save(this.reportRepo.create({ reporterId, targetType, targetId, reason, details }));
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleGuestCleanup() {
    const { deleted } = await this.deleteExpiredGuests();
    if (deleted > 0) this.logger.log(`만료된 게스트 ${deleted}명 자동 삭제`);
  }

  /** 매일 새벽 4시: 오래된 데이터 정리 */
  @Cron('0 4 * * *')
  async handleDataRetention() {
    // 1. 방별 재생 이력 — 최근 N개만 유지
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

    // 2. played=true 큐 아이템 — N일 이상 된 것 삭제
    const queueCutoff = new Date(Date.now() - QUEUE_PLAYED_RETENTION_DAYS * 86_400_000);
    const queueResult = await this.queueRepo
      .createQueryBuilder()
      .delete()
      .where('played = true AND added_at < :cutoff', { cutoff: queueCutoff })
      .execute();

    // 3. 미사용 트랙 — N일간 재생 이력 없고 큐에도 없는 트랙 삭제
    const trackCutoff = new Date(Date.now() - TRACK_UNUSED_DAYS * 86_400_000);
    const trackResult = await this.trackRepo
      .createQueryBuilder('t')
      .delete()
      .where('t.fetched_at < :cutoff', { cutoff: trackCutoff })
      .andWhere('t.source_id NOT IN (SELECT DISTINCT source_id FROM play_histories WHERE played_at > :cutoff)', {
        cutoff: trackCutoff,
      })
      .andWhere('t.id NOT IN (SELECT DISTINCT track_id FROM room_queues WHERE played = false)')
      .execute();

    if (historyDeleted || queueResult.affected || trackResult.affected) {
      this.logger.log(
        `[Retention] history: -${historyDeleted}, queues: -${queueResult.affected ?? 0}, tracks: -${trackResult.affected ?? 0}`,
      );
    }
  }
}
