import { Controller, Get, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';

import { AuthService } from '../auth/auth.service.js';
import { User } from '../entities/user.entity.js';
import { PushService } from '../push/push.service.js';
import { UserRole } from '../types/user-role.enum.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/** 개발 환경 전용 테스트 엔드포인트 — 프로덕션에서는 등록되지 않음 */
@ApiExcludeController()
@Controller('test')
export class TestController {
  private readonly logger = new Logger(TestController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly pushService: PushService,
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /** superAdmin JWT 토큰 발급 */
  @Get('token')
  async getSuperAdminToken() {
    const admin = await this.userRepo.findOneBy({ role: UserRole.SuperAdmin });
    if (!admin) return { error: 'No superAdmin user found' };
    const tokens = this.auth.generateTokens(admin);
    this.logger.log(`Dev token issued for ${admin.nickname} (${admin.id})`);
    return { userId: admin.id, nickname: admin.nickname, ...tokens };
  }

  /** 테스트 Push 발송 (superAdmin에게) */
  @Get('push')
  async testPush() {
    const admin = await this.userRepo.findOneBy({ role: UserRole.SuperAdmin });
    if (!admin) return { error: 'No superAdmin user found' };
    await this.pushService.sendTestPush(admin.id);
    return { ok: true, userId: admin.id };
  }
}
