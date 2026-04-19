import type { TrackSource } from './dto/add-tracks-body.dto.js';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';

import { PlayHistory } from '../entities/play-history.entity.js';

import { AppException } from '../exceptions/app.exception.js';
import { Room } from '../entities/room.entity.js';
import { Permission } from '../types/permission.enum.js';
import { ErrorCode } from '../types/error-code.enum.js';
import { RoomPermission } from '../entities/room-permission.entity.js';
import { RoomQueue } from '../entities/room-queue.entity.js';
import { Track } from '../entities/track.entity.js';
import type { User } from '../entities/user.entity.js';

@Injectable()
export class QueueService {
  constructor(
    @InjectRepository(RoomQueue) private queueRepo: Repository<RoomQueue>,
    @InjectRepository(Track) private trackRepo: Repository<Track>,
    @InjectRepository(RoomPermission) private permRepo: Repository<RoomPermission>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(PlayHistory) private playHistoryRepo: Repository<PlayHistory>,
  ) {}

  getQueue(roomId: string) {
    return this.queueRepo.find({
      where: { room: { id: roomId }, played: false },
      order: { position: 'ASC' },
      relations: ['track', 'addedBy'],
    });
  }

  async getHistory(roomId: string, limit = 50) {
    const playback = await this.queueRepo.manager.findOne(
      (await import('../entities/room-playback.entity.js')).RoomPlayback,
      { where: { roomId }, relations: ['track'] },
    );
    const currentTrackId = playback?.track?.id;

    const items = await this.queueRepo.find({
      where: { room: { id: roomId }, played: true },
      order: { position: 'DESC' },
      relations: ['track', 'addedBy'],
      take: limit + 1,
    });

    // 현재 재생 중인 곡 제외
    return items.filter((i) => i.track.id !== currentTrackId).slice(0, limit);
  }

  async getQuota(roomId: string, userId: string) {
    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) return { used: 0, limit: 0, windowMin: 0, unlimited: true, banned: false, cooldownSourceIds: [] };
    const cooldownSourceIds = await this.getCooldownSourceIds(roomId, room.replayCooldownMin);
    const isPrivileged = room.hostId === userId;
    if (isPrivileged) {
      return {
        used: 0,
        limit: room.enqueueLimitPerWindow,
        windowMin: room.enqueueWindowMin,
        unlimited: true,
        banned: false,
        cooldownSourceIds: [],
      };
    }
    const perm = await this.permRepo.findOneBy({ roomId, userId });
    if (perm && !perm.permissions.includes(Permission.AddQueue))
      return { used: 0, limit: 0, windowMin: 0, unlimited: false, banned: true, cooldownSourceIds };
    const since = new Date(Date.now() - room.enqueueWindowMin * 60_000);
    const used = await this.queueRepo
      .createQueryBuilder('q')
      .where('q.room_id = :roomId', { roomId })
      .andWhere('q.added_by = :userId', { userId })
      .andWhere('q.added_at >= :since', { since })
      .getCount();
    return {
      used,
      limit: room.enqueueLimitPerWindow,
      windowMin: room.enqueueWindowMin,
      unlimited: false,
      banned: false,
      cooldownSourceIds,
    };
  }

  private async getCooldownSourceIds(roomId: string, cooldownMin: number): Promise<string[]> {
    if (cooldownMin === 0) return [];
    const qb = this.playHistoryRepo
      .createQueryBuilder('h')
      .select('DISTINCT h.source_id', 'sourceId')
      .where('h.room_id = :roomId', { roomId });
    if (cooldownMin > 0) {
      qb.andWhere('h.played_at > :since', { since: new Date(Date.now() - cooldownMin * 60_000) });
    }
    const rows = await qb.getRawMany<{ sourceId: string }>();
    return rows.map((r) => r.sourceId);
  }

  async addTrack(roomId: string, trackId: string, userId: string) {
    const dup = await this.queueRepo.findOneBy({ room: { id: roomId }, track: { id: trackId }, played: false });
    if (dup) throw new AppException(ErrorCode.QUEUE_002);

    const total = await this.queueRepo.countBy({ room: { id: roomId }, played: false });
    if (total >= 50) throw new AppException(ErrorCode.QUEUE_004);

    const room = await this.roomRepo.findOneBy({ id: roomId });
    const isPrivileged = room?.hostId === userId;

    if (!isPrivileged && room) {
      const since = new Date(Date.now() - room.enqueueWindowMin * 60_000);
      const recentCount = await this.queueRepo
        .createQueryBuilder('q')
        .where('q.room_id = :roomId', { roomId })
        .andWhere('q.added_by = :userId', { userId })
        .andWhere('q.added_at >= :since', { since })
        .getCount();
      if (recentCount >= room.enqueueLimitPerWindow) {
        throw new AppException(ErrorCode.QUEUE_005);
      }
    }

    const userCount = await this.queueRepo.countBy({ room: { id: roomId }, addedBy: { id: userId }, played: false });
    if (userCount >= 10) throw new AppException(ErrorCode.QUEUE_005);

    const max = await this.queueRepo
      .createQueryBuilder('q')
      .select('COALESCE(MAX(q.position), 0)', 'max')
      .where('q.room_id = :roomId', { roomId })
      .getRawOne<{ max: number }>();

    return this.queueRepo.save(
      this.queueRepo.create({
        room: { id: roomId } as Room,
        track: { id: trackId } as Track,
        addedBy: { id: userId } as unknown as User,
        position: (max?.max ?? 0) + 1,
      }),
    );
  }

  async addTracks(roomId: string, items: TrackSource[], userId: string) {
    const total = await this.queueRepo.countBy({ room: { id: roomId }, played: false });
    if (total + items.length > 50) throw new AppException(ErrorCode.QUEUE_004);

    const room = await this.roomRepo.findOneBy({ id: roomId });
    const isPrivileged = room?.hostId === userId;

    // 호스트가 아니면 maxSelectPerAdd 제한 적용
    if (!isPrivileged && room && items.length > room.maxSelectPerAdd) {
      throw new AppException(ErrorCode.QUEUE_007);
    }

    // sourceId → Track upsert
    const tracks: Track[] = [];
    for (const item of items) {
      let track = await this.trackRepo.findOneBy({ sourceId: item.sourceId });
      if (!track) {
        track = await this.trackRepo.save(
          this.trackRepo.create({
            provider: item.provider,
            sourceId: item.sourceId,
            name: item.name,
            artist: item.artist,
            thumbnail: item.thumbnail,
            durationMs: item.durationMs,
            fetchedAt: new Date(),
          }),
        );
      }
      tracks.push(track);
    }

    // 중복 제거 (큐 + 현재 재생 중인 곡)
    const existing = await this.queueRepo.find({
      where: { room: { id: roomId }, played: false },
      select: ['track'],
      relations: ['track'],
    });
    const existingIds = new Set(existing.map((q) => q.track.id));
    const playback = await this.queueRepo.manager.findOne(
      (await import('../entities/room-playback.entity.js')).RoomPlayback,
      { where: { roomId }, relations: ['track'] },
    );
    if (playback?.track) existingIds.add(playback.track.id);
    const unique = tracks.filter((t) => !existingIds.has(t.id));
    if (!unique.length) throw new AppException(ErrorCode.QUEUE_003);

    // 재신청 쿨다운 체크 (0=제한없음, -1=방 종료까지, >0=N분)
    if (!isPrivileged && room && room.replayCooldownMin !== 0) {
      for (const track of unique) {
        const where: Record<string, unknown> = { room: { id: roomId }, sourceId: track.sourceId };
        if (room.replayCooldownMin > 0) {
          where.playedAt = MoreThan(new Date(Date.now() - room.replayCooldownMin * 60_000));
        }
        const recent = await this.playHistoryRepo.findOne({ where, order: { playedAt: 'DESC' } });
        if (recent) throw new AppException(ErrorCode.QUEUE_008);
      }
    }

    if (!isPrivileged && room) {
      const since = new Date(Date.now() - room.enqueueWindowMin * 60_000);
      const recentCount = await this.queueRepo
        .createQueryBuilder('q')
        .where('q.room_id = :roomId', { roomId })
        .andWhere('q.added_by = :userId', { userId })
        .andWhere('q.added_at >= :since', { since })
        .getCount();
      if (recentCount + unique.length > room.enqueueLimitPerWindow) {
        throw new AppException(ErrorCode.QUEUE_005);
      }
    }

    const max = await this.queueRepo
      .createQueryBuilder('q')
      .select('COALESCE(MAX(q.position), 0)', 'max')
      .where('q.room_id = :roomId', { roomId })
      .getRawOne<{ max: number }>();
    let pos = (max?.max ?? 0) + 1;

    const entries = unique.map((track) =>
      this.queueRepo.create({
        room: { id: roomId } as Room,
        track,
        addedBy: { id: userId } as unknown as User,
        position: pos++,
      }),
    );
    return this.queueRepo.save(entries);
  }

  async removeTrack(roomId: string, queueId: string, userId: string) {
    const entry = await this.queueRepo.findOne({
      where: { id: queueId, room: { id: roomId } },
      relations: ['addedBy'],
    });
    if (!entry) throw new AppException(ErrorCode.QUEUE_001);

    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (entry.addedBy?.id !== userId && room?.hostId !== userId) {
      throw new AppException(ErrorCode.COMMON_001);
    }

    await this.queueRepo.remove(entry);
  }

  async reorder(roomId: string, queueId: string, newPosition: number, version: number) {
    return this.queueRepo.manager.transaction(async (em) => {
      const item = await em.findOne(RoomQueue, { where: { id: queueId, room: { id: roomId }, version } });
      if (!item) throw new AppException(ErrorCode.QUEUE_006);
      const oldPos = item.position;
      if (oldPos === newPosition) return;

      if (oldPos < newPosition) {
        await em
          .createQueryBuilder()
          .update(RoomQueue)
          .set({ position: () => 'position - 1' })
          .where('room_id = :roomId AND played = false AND position > :oldPos AND position <= :newPos', {
            roomId,
            oldPos,
            newPos: newPosition,
          })
          .execute();
      } else {
        await em
          .createQueryBuilder()
          .update(RoomQueue)
          .set({ position: () => 'position + 1' })
          .where('room_id = :roomId AND played = false AND position >= :newPos AND position < :oldPos', {
            roomId,
            oldPos,
            newPos: newPosition,
          })
          .execute();
      }
      item.position = newPosition;
      item.version += 1;
      await em.save(item);
    });
  }
}
