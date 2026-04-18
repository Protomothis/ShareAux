import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { Repository } from 'typeorm';

import { Room } from '../entities/room.entity.js';
import { RoomBan } from '../entities/room-ban.entity.js';
import { RoomMember } from '../entities/room-member.entity.js';
import { RoomPermission } from '../entities/room-permission.entity.js';
import { RoomPlayback } from '../entities/room-playback.entity.js';
import type { LeaveResult } from '../types/index.js';
import { AutoDjMode, Permission } from '../types/index.js';
import type { CreateRoomDto } from './dto/create-room.dto.js';
import type { UpdateRoomDto } from './dto/update-room.dto.js';
import { MemberService } from './member.service.js';

@Injectable()
export class RoomsService implements OnModuleInit {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(RoomMember) private memberRepo: Repository<RoomMember>,
    @InjectRepository(RoomPermission) private permRepo: Repository<RoomPermission>,
    @InjectRepository(RoomPlayback) private playbackRepo: Repository<RoomPlayback>,
    @InjectRepository(RoomBan) private banRepo: Repository<RoomBan>,
    public readonly members: MemberService,
  ) {}

  async onModuleInit(): Promise<void> {
    const activeRooms = await this.roomRepo.findBy({ isActive: true });
    if (!activeRooms.length) return;

    const ids = activeRooms.map((r) => r.id);
    await this.memberRepo
      .createQueryBuilder()
      .delete()
      .from(RoomMember)
      .where('room_id IN (:...ids)', { ids })
      .execute();
    await this.roomRepo.createQueryBuilder().delete().from(Room).where('id IN (:...ids)', { ids }).execute();

    this.logger.warn(`Cleaned up ${activeRooms.length} ghost room(s) on startup`);
  }

  async addMember(roomId: string, userId: string): Promise<void> {
    return this.members.addMember(roomId, userId);
  }

  async removeMember(roomId: string, userId: string): Promise<void> {
    return this.members.removeMember(roomId, userId);
  }

  async getMemberCount(roomId: string): Promise<number> {
    return this.members.getMemberCount(roomId);
  }

  async deactivateRoom(roomId: string): Promise<void> {
    await this.roomRepo.delete(roomId);
  }

  async isRoomActive(roomId: string): Promise<boolean> {
    return this.roomRepo.existsBy({ id: roomId, isActive: true });
  }

  async isHost(roomId: string, userId: string): Promise<boolean> {
    return this.members.isHost(roomId, userId);
  }

  async transferHost(roomId: string) {
    return this.members.transferHost(roomId);
  }

  async create(hostId: string, dto: CreateRoomDto): Promise<Room> {
    const user = await this.roomRepo.manager.findOneBy((await import('../entities/user.entity.js')).User, {
      id: hostId,
    });
    if (!user) throw new UnauthorizedException('User not found — please re-login');
    const room = this.roomRepo.create({
      name: dto.name,
      maxMembers: dto.maxMembers ?? 10,
      isPrivate: dto.isPrivate ?? false,
      password: dto.password ? await bcrypt.hash(dto.password, 10) : undefined,
      inviteCode: nanoid(8),
      hostId: hostId,
      enqueueWindowMin: dto.enqueueWindowMin ?? 30,
      enqueueLimitPerWindow: dto.enqueueLimitPerWindow ?? 15,
      crossfade: dto.crossfade ?? true,
      maxSelectPerAdd: dto.maxSelectPerAdd ?? 3,
      defaultEnqueueEnabled: dto.defaultEnqueueEnabled ?? true,
      defaultVoteSkipEnabled: dto.defaultVoteSkipEnabled ?? true,
      autoDjEnabled: dto.autoDjEnabled ?? false,
      autoDjMode: dto.autoDjMode ?? AutoDjMode.Related,
      autoDjThreshold: dto.autoDjThreshold ?? 2,
    });
    const saved = await this.roomRepo.save(room);

    await this.memberRepo.save({ roomId: saved.id, userId: hostId, role: 'host' });
    await this.permRepo.save({
      roomId: saved.id,
      userId: hostId,
      permissions: Object.values(Permission),
    });
    await this.playbackRepo.save({ roomId: saved.id });

    return saved;
  }

  async findAll(): Promise<(Room & { memberCount: number })[]> {
    const rooms = await this.roomRepo.find({
      where: { isActive: true, isPrivate: false },
      relations: ['host'],
    });

    if (!rooms.length) return [];

    const ids = rooms.map((r) => r.id);
    const counts = await this.memberRepo
      .createQueryBuilder('m')
      .select('m.room_id', 'room_id')
      .addSelect('COUNT(*)', 'count')
      .where('m.room_id IN (:...ids)', { ids })
      .groupBy('m.room_id')
      .getRawMany<{ room_id: string; count: string }>();

    const playbacks = await this.playbackRepo.find({
      where: ids.map((id) => ({ roomId: id })),
      relations: ['track'],
    });

    const countMap = new Map(counts.map((c) => [c.room_id, Number(c.count)]));
    const pbMap = new Map(playbacks.map((p) => [p.roomId, p]));
    return rooms.map((r) =>
      Object.assign(r, { memberCount: countMap.get(r.id) ?? 0, playback: pbMap.get(r.id) ?? null }),
    );
  }

  async findOne(id: string): Promise<Room> {
    const room = await this.roomRepo.findOne({
      where: { id, isActive: true },
      relations: ['host'],
    });
    if (!room) throw new NotFoundException('Room not found');

    const members = await this.memberRepo.find({ where: { roomId: id }, relations: ['user'] });
    const perms = await this.permRepo.find({ where: { roomId: id } });
    const permMap = new Map(perms.map((p) => [p.userId, p]));
    const membersWithPerms = members.map((m) => Object.assign(m, { permission: permMap.get(m.userId) ?? null }));
    const playback = await this.playbackRepo.findOne({ where: { roomId: id }, relations: ['track'] });

    return Object.assign(room, { members: membersWithPerms, playback });
  }

  async join(roomId: string, userId: string, password?: string): Promise<RoomMember> {
    // password는 select:false이므로 is_private로 판단 후 필요 시 명시적 select
    const room = await this.roomRepo.findOneBy({ id: roomId, isActive: true });
    if (!room) throw new NotFoundException('Room not found');

    const count = await this.memberRepo.countBy({ roomId });
    if (count >= room.maxMembers) throw new BadRequestException('Room is full');

    const banned = await this.banRepo.findOneBy({ roomId, userId });
    if (banned) throw new ForbiddenException('이 방에서 추방되어 입장할 수 없습니다');

    if (room.isPrivate) {
      const withPw = await this.roomRepo
        .createQueryBuilder('room')
        .addSelect('room.password')
        .where('room.id = :id', { id: roomId })
        .getOne();
      if (withPw?.password && (!password || !(await bcrypt.compare(password, withPw.password)))) {
        throw new ForbiddenException('Invalid password');
      }
    }

    const existing = await this.memberRepo.findOneBy({ roomId, userId });
    if (existing) return existing;

    const member = await this.memberRepo.save({ roomId, userId, role: 'member' });
    await this.permRepo.save({ roomId, userId });
    return member;
  }

  async leave(roomId: string, userId: string): Promise<LeaveResult> {
    const wasHost = await this.isHost(roomId, userId);
    await this.memberRepo.delete({ roomId, userId });

    const remaining = await this.getMemberCount(roomId);
    if (remaining === 0) {
      await this.deactivateRoom(roomId);
      return { roomClosed: true };
    }
    if (wasHost) {
      const newHost = await this.transferHost(roomId);
      if (newHost) return { hostChanged: newHost };
      // 호스트 권한 가진 멤버 없음 → 방 폭파
      await this.deactivateRoom(roomId);
      return { roomClosed: true };
    }
    return {};
  }

  async remove(roomId: string, hostId: string): Promise<void> {
    const room = await this.roomRepo.findOne({ where: { id: roomId }, relations: ['host'] });
    if (!room) throw new NotFoundException('Room not found');
    if (room.host.id !== hostId) throw new ForbiddenException('Only host can delete');
    await this.roomRepo.remove(room);
  }

  async update(roomId: string, hostId: string, dto: UpdateRoomDto): Promise<Room> {
    const room = await this.roomRepo.findOneBy({ id: roomId, isActive: true });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== hostId) throw new ForbiddenException('Only host can update room');
    const enqueueChanged =
      (dto.enqueueWindowMin && dto.enqueueWindowMin !== room.enqueueWindowMin) ||
      (dto.enqueueLimitPerWindow && dto.enqueueLimitPerWindow !== room.enqueueLimitPerWindow);
    if (dto.name) room.name = dto.name;
    if (dto.maxMembers) room.maxMembers = dto.maxMembers;
    if (dto.enqueueWindowMin) room.enqueueWindowMin = dto.enqueueWindowMin;
    if (dto.enqueueLimitPerWindow) room.enqueueLimitPerWindow = dto.enqueueLimitPerWindow;
    if (dto.crossfade !== undefined) room.crossfade = dto.crossfade;
    if (dto.maxSelectPerAdd !== undefined) room.maxSelectPerAdd = dto.maxSelectPerAdd;
    if (dto.defaultEnqueueEnabled !== undefined) room.defaultEnqueueEnabled = dto.defaultEnqueueEnabled;
    if (dto.defaultVoteSkipEnabled !== undefined) room.defaultVoteSkipEnabled = dto.defaultVoteSkipEnabled;
    if (dto.autoDjEnabled !== undefined) room.autoDjEnabled = dto.autoDjEnabled;
    if (dto.autoDjMode !== undefined) room.autoDjMode = dto.autoDjMode;
    if (dto.autoDjThreshold !== undefined) room.autoDjThreshold = dto.autoDjThreshold;
    const saved = await this.roomRepo.save(room);
    if (enqueueChanged) {
      const pastDate = new Date(Date.now() - room.enqueueWindowMin * 60_000 - 1000);
      await this.roomRepo.manager
        .createQueryBuilder()
        .update('room_queues')
        .set({ added_at: pastDate })
        .where('room_id = :roomId', { roomId })
        .andWhere('played = false')
        .execute();
    }
    return saved;
  }

  async updatePermissions(
    roomId: string,
    hostId: string,
    targetUserId: string,
    permissions: Permission[],
  ): Promise<RoomPermission> {
    return this.members.updatePermissions(roomId, hostId, targetUserId, permissions);
  }

  async getEffectivePermissions(roomId: string, userId: string) {
    return this.members.getEffectivePermissions(roomId, userId);
  }

  async resetEnqueueCounts(roomId: string, hostId: string): Promise<void> {
    const room = await this.roomRepo.findOneBy({ id: roomId, isActive: true });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== hostId) throw new ForbiddenException('Only host can reset');
    const pastDate = new Date(Date.now() - room.enqueueWindowMin * 60_000 - 1000);
    await this.roomRepo.manager
      .createQueryBuilder()
      .update('room_queues')
      .set({ addedAt: pastDate })
      .where('room_id = :roomId', { roomId })
      .andWhere('played = false')
      .execute();
  }

  async transferHostTo(roomId: string, hostId: string, targetUserId: string) {
    return this.members.transferHostTo(roomId, hostId, targetUserId);
  }

  async kick(roomId: string, hostId: string, targetUserId: string): Promise<void> {
    return this.members.kick(roomId, hostId, targetUserId);
  }

  async resetBans(roomId: string, hostId: string): Promise<number> {
    return this.members.resetBans(roomId, hostId);
  }

  async getBanCount(roomId: string): Promise<number> {
    return this.members.getBanCount(roomId);
  }

  async getBans(roomId: string) {
    return this.members.getBans(roomId);
  }

  async unban(roomId: string, hostId: string, targetUserId: string): Promise<void> {
    return this.members.unban(roomId, hostId, targetUserId);
  }
}
