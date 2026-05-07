import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PlayHistory } from '../entities/play-history.entity.js';
import { Room } from '../entities/room.entity.js';
import { RoomMember } from '../entities/room-member.entity.js';
import { RoomPlayback } from '../entities/room-playback.entity.js';
import { RoomQueue } from '../entities/room-queue.entity.js';
import { User } from '../entities/user.entity.js';
import { AppException } from '../exceptions/app.exception.js';
import { AudioService } from '../services/audio.service.js';
import { MetricsService } from '../services/metrics.service.js';
import { PreloadService } from '../services/preload.service.js';
import { ErrorCode } from '../types/error-code.enum.js';

@Injectable()
export class AdminMetricsService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
    @InjectRepository(RoomMember) private readonly memberRepo: Repository<RoomMember>,
    @InjectRepository(PlayHistory) private readonly playHistoryRepo: Repository<PlayHistory>,
    @InjectRepository(RoomPlayback) private readonly playbackRepo: Repository<RoomPlayback>,
    @InjectRepository(RoomQueue) private readonly queueRepo: Repository<RoomQueue>,
    private readonly audio: AudioService,
    private readonly preload: PreloadService,
    private readonly metrics: MetricsService,
  ) {}

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
    const toRecord = (rows: { key: string; count: number }[]) => Object.fromEntries(rows.map((r) => [r.key, r.count]));
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
}
