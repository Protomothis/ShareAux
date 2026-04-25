import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { User } from '../entities/user.entity.js';
import { PushModule } from '../push/push.module.js';
import { TestController } from './test.controller.js';

/** 개발 환경 전용 모듈 — AppModule에서 조건부 등록 */
@Module({
  imports: [AuthModule, PushModule, TypeOrmModule.forFeature([User])],
  controllers: [TestController],
})
export class TestModule {}
