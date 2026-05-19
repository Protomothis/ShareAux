import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { Room } from '../entities/room.entity.js';
import { User } from '../entities/user.entity.js';
import { PlayerModule } from '../player/player.module.js';
import { PushModule } from '../push/push.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { ServicesModule } from '../services/services.module.js';
import { TestController } from './test.controller.js';

/** 개발 환경 전용 모듈 — AppModule에서 조건부 등록 */
@Module({
  imports: [
    AuthModule,
    PushModule,
    RoomsModule,
    PlayerModule,
    QueueModule,
    ServicesModule,
    TypeOrmModule.forFeature([User, Room]),
  ],
  controllers: [TestController],
})
export class TestModule {}
