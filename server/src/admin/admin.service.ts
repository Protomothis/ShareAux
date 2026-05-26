import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { nanoid } from 'nanoid';
import { Repository } from 'typeorm';

import { AuthService } from '../auth/auth.service.js';
import { InviteCode } from '../entities/invite-code.entity.js';
import { Report } from '../entities/report.entity.js';
import { Room } from '../entities/room.entity.js';
import { RoomMember } from '../entities/room-member.entity.js';
import { User } from '../entities/user.entity.js';
import { UserTrackHistory } from '../entities/user-track-history.entity.js';
import { AppException } from '../exceptions/app.exception.js';
import { ErrorCode } from '../types/error-code.enum.js';
import { Permission, ReportStatus, UserRole } from '../types/index.js';
import type { CreateInviteCodeDto } from './dto/create-invite-code.dto.js';

const UserStatusFilter = { Active: 'active', Banned: 'banned' } as const;

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
    @InjectRepository(RoomMember) private readonly memberRepo: Repository<RoomMember>,
    @InjectRepository(InviteCode) private readonly inviteCodeRepo: Repository<InviteCode>,
    @InjectRepository(Report) private readonly reportRepo: Repository<Report>,
    @InjectRepository(UserTrackHistory) private readonly userHistoryRepo: Repository<UserTrackHistory>,
    @Inject(forwardRef(() => AuthService)) private readonly authService: AuthService,
  ) {}

  // --- Dashboard ---

  async getDashboard() {
    const [totalUsers, activeRooms, totalRooms] = await Promise.all([
      this.userRepo.count(),
      this.roomRepo.count({ where: { isActive: true } }),
      this.roomRepo.count(),
    ]);
    return { totalUsers, activeRooms, totalRooms };
  }

  // --- Users ---

  async getUsers(page: number, limit: number, search?: string, role?: string, provider?: string, status?: string) {
    const qb = this.userRepo.createQueryBuilder('u').orderBy('u.createdAt', 'DESC');

    if (search) qb.andWhere('(u.username ILIKE :s OR u.nickname ILIKE :s)', { s: `%${search}%` });
    if (role) qb.andWhere('u.role = :role', { role });
    if (provider) qb.andWhere('u.provider = :provider', { provider });
    if (status === UserStatusFilter.Banned) qb.andWhere('u.banned_at IS NOT NULL');
    else if (status === UserStatusFilter.Active) qb.andWhere('u.banned_at IS NULL');

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

  async deleteUser(userId: string): Promise<void> {
    await this.authService.deleteAccount(userId);
  }

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

  // --- Rooms ---

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
    return { success: true };
  }

  // --- Invite Codes ---

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
        createdBy: { id: userId },
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

  async getInviteCodeUsers(inviteCodeId: string) {
    return this.userRepo.find({
      where: { inviteCode: { id: inviteCodeId } },
      order: { createdAt: 'DESC' },
      select: ['id', 'nickname', 'username', 'role', 'provider', 'createdAt'],
    });
  }

  async deleteInviteCodeGuests(inviteCodeId: string): Promise<number> {
    const guests = await this.userRepo.find({
      where: { inviteCode: { id: inviteCodeId }, role: UserRole.Guest },
      select: ['id'],
    });
    if (!guests.length) return 0;
    for (const g of guests) {
      await this.authService.deleteAccount(g.id).catch(() => {});
    }
    return guests.length;
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

  async resolveReport(reportId: string, resolvedByUserId: string, status: ReportStatus) {
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
}
