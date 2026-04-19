import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { LessThan, Repository } from 'typeorm';

import { AUTH_ACCESS_EXPIRY_SEC, AUTH_GUEST_EXPIRY_SEC, AUTH_REFRESH_EXPIRY_SEC } from '../constants.js';
import { AppException } from '../exceptions/app.exception.js';
import { InviteCode } from '../entities/invite-code.entity.js';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import { User } from '../entities/user.entity.js';
import type { OAuthProfile } from '../types/index.js';
import { AuthProvider, ErrorCode, Permission, UserRole } from '../types/index.js';
import type { UserCookiePayload } from './cookie.util.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: UserCookiePayload;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(InviteCode) private readonly inviteCodeRepo: Repository<InviteCode>,
    @InjectRepository(RefreshToken) private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
  ) {}

  async validateOAuthUser(profile: OAuthProfile): Promise<User> {
    const user = await this.userRepo.findOneBy({ googleId: profile.googleId });
    if (!user) {
      throw new AppException(ErrorCode.AUTH_016);
    }
    if (user.bannedAt) throw new AppException(ErrorCode.AUTH_002);
    user.email = profile.email;
    user.avatarUrl = profile.avatarUrl ?? user.avatarUrl;
    return this.userRepo.save(user);
  }

  async linkGoogle(userId: string, googleId: string, email: string): Promise<void> {
    const existing = await this.userRepo.findOneBy({ googleId });
    if (existing && existing.id !== userId) {
      throw new AppException(ErrorCode.AUTH_017);
    }
    await this.userRepo.update(userId, { googleId, email });
  }

  async updateNickname(userId: string, nickname: string): Promise<void> {
    await this.userRepo.update(userId, { nickname });
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :userId', { userId })
      .getOne();
    if (!user?.passwordHash) throw new AppException(ErrorCode.AUTH_010);
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppException(ErrorCode.AUTH_011);
    await this.userRepo.update(userId, { passwordHash: await bcrypt.hash(newPassword, 10) });
  }

  async generateTokenPair(user: User): Promise<TokenPair> {
    const payload = { sub: user.id, email: user.email, nickname: user.nickname, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: AUTH_ACCESS_EXPIRY_SEC });
    const refreshToken = this.jwtService.sign({ sub: user.id }, { expiresIn: AUTH_REFRESH_EXPIRY_SEC });

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + AUTH_REFRESH_EXPIRY_SEC * 1000),
      }),
    );

    return { accessToken, refreshToken, user: { sub: user.id, nickname: user.nickname, role: user.role } };
  }

  async refreshTokens(token: string): Promise<TokenPair> {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify<{ sub: string }>(token);
    } catch {
      throw new AppException(ErrorCode.AUTH_013);
    }

    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash: this.hash(token), revoked: false },
    });
    if (!stored) throw new AppException(ErrorCode.AUTH_014);

    // Rotation: 기존 토큰 무효화
    stored.revoked = true;
    await this.refreshTokenRepo.save(stored);

    const user = await this.userRepo.findOneBy({ id: payload.sub });
    if (!user) throw new AppException(ErrorCode.AUTH_012);
    if (user.bannedAt) throw new AppException(ErrorCode.AUTH_002);

    return this.generateTokenPair(user);
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshTokenRepo.update({ tokenHash: this.hash(token) }, { revoked: true });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo.update({ userId, revoked: false }, { revoked: true });
  }

  /** 만료된 refresh token 정리 (cron에서 호출) */
  async cleanupExpiredTokens(): Promise<void> {
    const { affected } = await this.refreshTokenRepo.delete({ expiresAt: LessThan(new Date()) });
    if (affected) this.logger.log(`Cleaned up ${affected} expired refresh tokens`);
  }

  async register(dto: RegisterDto): Promise<TokenPair> {
    const isFirstUser = (await this.userRepo.count()) === 0;
    let invite: InviteCode | null = null;

    if (!isFirstUser) {
      // 첫 유저가 아니면 초대코드 필수
      if (!dto.code) throw new AppException(ErrorCode.AUTH_007);
      invite = await this.inviteCodeRepo.findOneBy({ code: dto.code, isActive: true });
      if (!invite) throw new AppException(ErrorCode.AUTH_003);
      if (invite.expiresAt && invite.expiresAt < new Date()) throw new AppException(ErrorCode.AUTH_004);
      if (invite.usedCount >= invite.maxUses) throw new AppException(ErrorCode.AUTH_005);
      if (!invite.allowRegistration) throw new AppException(ErrorCode.AUTH_006);
    }

    const existing = await this.userRepo.findOneBy({ username: dto.username });
    if (existing) throw new AppException(ErrorCode.AUTH_008);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepo.save(
      this.userRepo.create({
        provider: AuthProvider.Local,
        username: dto.username,
        passwordHash,
        nickname: dto.nickname,
        role: isFirstUser ? UserRole.SuperAdmin : UserRole.User,
        inviteCode: invite,
        accountPermissions: invite ? (invite.permissions as Permission[]) : Object.values(Permission),
      }),
    );

    if (invite) {
      invite.usedCount += 1;
      await this.inviteCodeRepo.save(invite);
    }

    return this.generateTokenPair(user);
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.username = :username', { username: dto.username })
      .getOne();
    if (!user?.passwordHash) throw new AppException(ErrorCode.AUTH_001);

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new AppException(ErrorCode.AUTH_001);
    if (user.bannedAt) throw new AppException(ErrorCode.AUTH_002);

    return this.generateTokenPair(user);
  }

  async guestLogin(code: string, nickname: string): Promise<TokenPair> {
    const invite = await this.inviteCodeRepo.findOneBy({ code, isActive: true });
    if (!invite) throw new AppException(ErrorCode.AUTH_003);
    if (invite.expiresAt && invite.expiresAt < new Date()) throw new AppException(ErrorCode.AUTH_004);
    if (invite.usedCount >= invite.maxUses) throw new AppException(ErrorCode.AUTH_005);

    const user = this.userRepo.create({
      provider: AuthProvider.Invite,
      nickname,
      role: UserRole.Guest,
      inviteCode: invite,
      accountPermissions: invite.permissions as Permission[],
    });
    await this.userRepo.save(user);

    invite.usedCount += 1;
    await this.inviteCodeRepo.save(invite);

    const payload = { sub: user.id, nickname: user.nickname, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: AUTH_GUEST_EXPIRY_SEC });
    return { accessToken, refreshToken: '', user: { sub: user.id, nickname: user.nickname, role: user.role } };
  }

  // --- account deletion ---

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :userId', { userId })
      .getOne();
    if (!user?.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash);
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new AppException(ErrorCode.AUTH_012);
    if (user.role === UserRole.SuperAdmin) throw new AppException(ErrorCode.AUTH_018);

    const mgr = this.userRepo.manager;

    // 수동 정리 (onDelete CASCADE 없는 관계)
    const { RoomMember } = await import('../entities/room-member.entity.js');
    const { RoomPermission } = await import('../entities/room-permission.entity.js');
    const { RoomBan } = await import('../entities/room-ban.entity.js');
    const { RoomQueue } = await import('../entities/room-queue.entity.js');
    const { PlayHistory } = await import('../entities/play-history.entity.js');
    const { Room } = await import('../entities/room.entity.js');

    await mgr.delete(RoomMember, { userId });
    await mgr.delete(RoomPermission, { userId });
    await mgr.delete(RoomBan, { userId });
    await mgr
      .createQueryBuilder()
      .update(RoomQueue)
      .set({ addedBy: null })
      .where('added_by = :userId', { userId })
      .execute();
    await mgr
      .createQueryBuilder()
      .update(PlayHistory)
      .set({ playedBy: null })
      .where('played_by = :userId', { userId })
      .execute();
    await mgr.update(Room, { hostId: userId, isActive: true }, { isActive: false });

    // user 삭제 (CASCADE: refresh_tokens, track_votes, user_track_history)
    await this.userRepo.delete(userId);
    this.logger.log(`Account deleted: ${userId}`);
  }

  // --- legacy 하위 호환 (Phase 2 완료 후 제거) ---

  generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, nickname: user.nickname, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign({ sub: user.id }, { expiresIn: '7d' }),
    };
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  verifyToken(token: string): { sub: string } {
    return this.jwtService.verify<{ sub: string }>(token);
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepo.findOneBy({ id });
  }
}
