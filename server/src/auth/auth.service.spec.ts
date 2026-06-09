import bcrypt from 'bcrypt';
import { createHash } from 'crypto';

import { AppException } from '../exceptions/app.exception.js';
import { AuthProvider, ErrorCode, UserRole } from '../types/index.js';
import { AuthService } from './auth.service.js';

// bcrypt mock — 비동기 hash/compare 단순화
jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    hash: jest.fn().mockResolvedValue('$hashed$'),
    compare: jest.fn(),
  },
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

function sha256(v: string): string {
  return createHash('sha256').update(v).digest('hex');
}

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: Record<string, jest.Mock>;
  let mockInviteCodeRepo: Record<string, jest.Mock>;
  let mockRefreshTokenRepo: Record<string, jest.Mock>;
  let mockJwtService: Record<string, jest.Mock>;

  beforeEach(() => {
    mockUserRepo = {
      count: jest.fn().mockResolvedValue(0),
      findOneBy: jest.fn(),
      save: jest.fn().mockImplementation((v) => Promise.resolve({ id: 'user-1', ...v })),
      create: jest.fn().mockImplementation((v) => v),
      createQueryBuilder: jest.fn(),
    };
    mockInviteCodeRepo = {
      findOneBy: jest.fn(),
      save: jest.fn().mockImplementation((v) => Promise.resolve(v)),
    };
    mockRefreshTokenRepo = {
      save: jest.fn().mockImplementation((v) => Promise.resolve(v)),
      create: jest.fn().mockImplementation((v) => v),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn(),
    };

    service = new AuthService(
      mockUserRepo as never,
      mockInviteCodeRepo as never,
      mockRefreshTokenRepo as never,
      mockJwtService as never,
    );
  });

  describe('register', () => {
    it('첫 유저 → SuperAdmin', async () => {
      mockUserRepo.count.mockResolvedValue(0);
      mockUserRepo.findOneBy.mockResolvedValue(null);

      const result = await service.register({ username: 'admin', password: 'pass', nickname: 'Admin' });

      expect(result.accessToken).toBe('mock-token');
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.SuperAdmin, provider: AuthProvider.Local }),
      );
    });

    it('두 번째 유저 → User (초대코드 필요)', async () => {
      mockUserRepo.count.mockResolvedValue(1);
      mockUserRepo.findOneBy.mockResolvedValue(null);
      mockInviteCodeRepo.findOneBy.mockResolvedValue({
        code: 'INV123',
        isActive: true,
        expiresAt: null,
        usedCount: 0,
        maxUses: 10,
        allowRegistration: true,
        permissions: ['Listen', 'Chat'],
      });

      await service.register({ username: 'user2', password: 'pass', nickname: 'User2', code: 'INV123' });

      expect(mockUserRepo.create).toHaveBeenCalledWith(expect.objectContaining({ role: UserRole.User }));
    });

    it('두 번째 유저 초대코드 없으면 에러', async () => {
      mockUserRepo.count.mockResolvedValue(1);
      await expect(service.register({ username: 'u', password: 'p', nickname: 'n' })).rejects.toThrow(AppException);
    });

    it('중복 username → AUTH_008', async () => {
      mockUserRepo.count.mockResolvedValue(0);
      mockUserRepo.findOneBy.mockResolvedValue({ id: 'existing' });
      await expect(service.register({ username: 'dup', password: 'p', nickname: 'n' })).rejects.toMatchObject({
        errorCode: ErrorCode.AUTH_008,
      });
    });
  });

  describe('login (validateUser)', () => {
    const setupLogin = (passwordHash: string | null, banned: boolean) => {
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(
          passwordHash
            ? { id: 'u1', passwordHash, bannedAt: banned ? new Date() : null }
            : null,
        ),
      };
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);
    };

    it('올바른 비밀번호 → 토큰 반환', async () => {
      setupLogin('$hashed$', false);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.login({ username: 'user', password: 'correct' });
      expect(result.accessToken).toBe('mock-token');
    });

    it('틀린 비밀번호 → AUTH_001', async () => {
      setupLogin('$hashed$', false);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login({ username: 'user', password: 'wrong' })).rejects.toMatchObject({
        errorCode: ErrorCode.AUTH_001,
      });
    });

    it('밴된 유저 → AUTH_002', async () => {
      setupLogin('$hashed$', true);
      mockBcrypt.compare.mockResolvedValue(true as never);

      await expect(service.login({ username: 'banned', password: 'pass' })).rejects.toMatchObject({
        errorCode: ErrorCode.AUTH_002,
      });
    });
  });

  describe('refreshTokens', () => {
    it('유효한 토큰 → 새 토큰 쌍 발급 + 기존 revoke', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'u1' });
      mockRefreshTokenRepo.findOne.mockResolvedValue({ id: 'rt1', revoked: false });
      mockUserRepo.findOneBy.mockResolvedValue({ id: 'u1', bannedAt: null, nickname: 'N', role: 'user' });

      const result = await service.refreshTokens('valid-refresh-token');
      expect(result.accessToken).toBe('mock-token');
      expect(mockRefreshTokenRepo.save).toHaveBeenCalledWith(expect.objectContaining({ revoked: true }));
    });

    it('만료/잘못된 토큰 → AUTH_013', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('expired');
      });

      await expect(service.refreshTokens('expired-token')).rejects.toMatchObject({
        errorCode: ErrorCode.AUTH_013,
      });
    });

    it('이미 사용(revoke)된 토큰 → AUTH_014', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'u1' });
      mockRefreshTokenRepo.findOne.mockResolvedValue(null); // revoked=false 조건에 안 걸림

      await expect(service.refreshTokens('reused-token')).rejects.toMatchObject({
        errorCode: ErrorCode.AUTH_014,
      });
    });
  });
});
