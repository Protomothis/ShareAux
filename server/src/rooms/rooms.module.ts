import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { Room } from '../entities/room.entity.js';
import { RoomBan } from '../entities/room-ban.entity.js';
import { RoomMember } from '../entities/room-member.entity.js';
import { RoomPermission } from '../entities/room-permission.entity.js';
import { RoomPlayback } from '../entities/room-playback.entity.js';
import { User } from '../entities/user.entity.js';
import { MemberService } from './member.service.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsGateway } from './rooms.gateway.js';
import { RoomsService } from './rooms.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, RoomMember, RoomPermission, RoomPlayback, RoomBan, User]),
    forwardRef(() => AuthModule),
  ],
  controllers: [RoomsController],
  providers: [MemberService, RoomsService, RoomsGateway],
  exports: [MemberService, RoomsService, RoomsGateway],
})
export class RoomsModule {}
