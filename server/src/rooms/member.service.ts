import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Room } from '../entities/room.entity.js';
import { RoomBan } from '../entities/room-ban.entity.js';
import { RoomMember } from '../entities/room-member.entity.js';
import { RoomPermission } from '../entities/room-permission.entity.js';
import { User } from '../entities/user.entity.js';
import type { TransferHostResult } from '../types/index.js';
import { DEFAULT_ROOM_PERMISSIONS, Permission, UserRole } from '../types/index.js';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(RoomMember) private memberRepo: Repository<RoomMember>,
    @InjectRepository(RoomPermission) private permRepo: Repository<RoomPermission>,
    @InjectRepository(RoomBan) private banRepo: Repository<RoomBan>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async addMember(roomId: string, userId: string): Promise<void> {
    const exists = await this.memberRepo.findOneBy({ roomId, userId });
    if (exists) return;
    const room = await this.roomRepo.findOneBy({ id: roomId, isActive: true });
    if (!room) return;
    const role = room.hostId === userId ? 'host' : 'member';
    await this.memberRepo.save({ roomId, userId, role });
    const hasPerm = await this.permRepo.findOneBy({ roomId, userId });
    if (!hasPerm) {
      let permissions = room.defaultEnqueueEnabled
        ? DEFAULT_ROOM_PERMISSIONS
        : DEFAULT_ROOM_PERMISSIONS.filter((p) => p !== Permission.AddQueue && p !== Permission.Search);
      if (!room.defaultVoteSkipEnabled) {
        permissions = permissions.filter((p) => p !== Permission.VoteSkip);
      }
      await this.permRepo.save({ roomId, userId, permissions });
    }
  }

  async removeMember(roomId: string, userId: string): Promise<void> {
    await this.memberRepo.delete({ roomId, userId });
  }

  async getMemberCount(roomId: string): Promise<number> {
    return this.memberRepo.countBy({ roomId });
  }

  /** 호스트 제외, voteSkip 권한이 있는 멤버 수 */
  async getVoteSkipEligibleCount(roomId: string): Promise<number> {
    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) return 0;
    const members = await this.memberRepo.find({ where: { roomId } });
    let count = 0;
    for (const m of members) {
      if (m.userId === room.hostId) continue;
      const { permissions } = await this.getEffectivePermissions(roomId, m.userId);
      if (permissions.includes(Permission.VoteSkip)) count++;
    }
    return count;
  }

  async isHost(roomId: string, userId: string): Promise<boolean> {
    const room = await this.roomRepo.findOneBy({ id: roomId });
    return room?.hostId === userId;
  }

  async transferHost(roomId: string): Promise<TransferHostResult | null> {
    // Host 권한이 있는 멤버 중 가장 먼저 입장한 사람 (1쿼리)
    const candidate = await this.memberRepo
      .createQueryBuilder('m')
      .innerJoin(RoomPermission, 'rp', 'rp.room_id = m.room_id AND rp.user_id = m.user_id')
      .leftJoinAndSelect('m.user', 'u')
      .where('m.room_id = :roomId', { roomId })
      .andWhere(`rp.permissions @> '"host"'`)
      .orderBy('m.joined_at', 'ASC')
      .getOne();
    if (!candidate) return null;
    await this.roomRepo.update(roomId, { hostId: candidate.userId });
    await this.memberRepo.update({ roomId, userId: candidate.userId }, { role: 'host' });
    return { id: candidate.userId, nickname: candidate.user?.nickname ?? 'Unknown' };
  }

  async transferHostTo(roomId: string, hostId: string, targetUserId: string): Promise<{ nickname: string }> {
    const room = await this.roomRepo.findOneBy({ id: roomId, isActive: true });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== hostId) throw new ForbiddenException('Only DJ can transfer');
    const target = await this.memberRepo.findOne({ where: { roomId, userId: targetUserId }, relations: ['user'] });
    if (!target) throw new NotFoundException('Member not found');
    if (target.user?.role === UserRole.Guest) throw new ForbiddenException('게스트에게 DJ를 위임할 수 없습니다');
    const targetPerm = await this.permRepo.findOneBy({ roomId, userId: targetUserId });
    if (!targetPerm?.permissions.includes(Permission.Host)) {
      throw new ForbiddenException('호스트 권한이 없는 멤버에게 위임할 수 없습니다');
    }
    await this.roomRepo.update(roomId, { hostId: targetUserId });
    await this.memberRepo.update({ roomId, userId: targetUserId }, { role: 'host' });
    await this.memberRepo.update({ roomId, userId: hostId }, { role: 'member' });

    // 새 호스트에게 전체 권한 부여, 이전 호스트에서 host 권한 제거
    const allPerms = Object.values(Permission);
    const newHostPerm = await this.permRepo.findOneBy({ roomId, userId: targetUserId });
    if (newHostPerm) {
      newHostPerm.permissions = allPerms;
      await this.permRepo.save(newHostPerm);
    }
    const oldHostPerm = await this.permRepo.findOneBy({ roomId, userId: hostId });
    if (oldHostPerm && oldHostPerm.permissions.includes(Permission.Host)) {
      oldHostPerm.permissions = oldHostPerm.permissions.filter((p) => p !== Permission.Host);
      await this.permRepo.save(oldHostPerm);
    }
    return { nickname: target.user?.nickname ?? 'Unknown' };
  }

  async kick(roomId: string, hostId: string, targetUserId: string): Promise<void> {
    const room = await this.roomRepo.findOneBy({ id: roomId, isActive: true });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== hostId) throw new ForbiddenException('Only DJ can kick');
    if (targetUserId === hostId) throw new BadRequestException('Cannot kick yourself');
    await this.memberRepo.delete({ roomId, userId: targetUserId });
    await this.permRepo.delete({ roomId, userId: targetUserId });
    await this.banRepo.save({ roomId, userId: targetUserId });
  }

  async updatePermissions(
    roomId: string,
    hostId: string,
    targetUserId: string,
    permissions: Permission[],
  ): Promise<RoomPermission> {
    const room = await this.roomRepo.findOneBy({ id: roomId });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== hostId) throw new ForbiddenException('Only host can change permissions');
    const existing = await this.permRepo.findOneBy({ roomId, userId: targetUserId });
    if (existing) {
      existing.permissions = permissions;
      return this.permRepo.save(existing);
    }
    return this.permRepo.save({ roomId, userId: targetUserId, permissions });
  }

  async getEffectivePermissions(
    roomId: string,
    userId: string,
  ): Promise<{ permissions: Permission[]; accountPermissions: Permission[]; roomPermissions: Permission[] }> {
    const room = await this.roomRepo.findOneBy({ id: roomId });
    const allPerms = Object.values(Permission);
    if (room?.hostId === userId)
      return { permissions: allPerms, accountPermissions: allPerms, roomPermissions: allPerms };
    const user = await this.userRepo.findOneBy({ id: userId });
    const isPrivileged = user?.role === UserRole.Admin || user?.role === UserRole.SuperAdmin;
    const accountPerms: Permission[] = isPrivileged ? allPerms : (user?.accountPermissions ?? []);
    const record = await this.permRepo.findOneBy({ roomId, userId });
    const roomPerms = record?.permissions ?? DEFAULT_ROOM_PERMISSIONS;
    return {
      permissions: accountPerms.filter((p) => roomPerms.includes(p)),
      accountPermissions: accountPerms,
      roomPermissions: roomPerms,
    };
  }

  async resetBans(roomId: string, hostId: string): Promise<number> {
    const room = await this.roomRepo.findOneBy({ id: roomId, isActive: true });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== hostId) throw new ForbiddenException('Only DJ can reset bans');
    const result = await this.banRepo.delete({ roomId });
    return result.affected ?? 0;
  }

  async getBanCount(roomId: string): Promise<number> {
    return this.banRepo.countBy({ roomId });
  }

  async getBans(roomId: string): Promise<{ userId: string; nickname: string; bannedAt: Date }[]> {
    const bans = await this.banRepo.find({ where: { roomId }, relations: ['user'], order: { bannedAt: 'DESC' } });
    return bans.map((b) => ({ userId: b.userId, nickname: b.user?.nickname ?? 'Unknown', bannedAt: b.bannedAt }));
  }

  async unban(roomId: string, hostId: string, targetUserId: string): Promise<void> {
    const room = await this.roomRepo.findOneBy({ id: roomId, isActive: true });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== hostId) throw new ForbiddenException('Only DJ can unban');
    await this.banRepo.delete({ roomId, userId: targetUserId });
  }
}
