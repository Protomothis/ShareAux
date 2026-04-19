import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Room } from '../entities/room.entity.js';
import { PlayHistory } from '../entities/play-history.entity.js';
import { RoomMember } from '../entities/room-member.entity.js';
import { RoomPermission } from '../entities/room-permission.entity.js';
import { RoomPlayback } from '../entities/room-playback.entity.js';
import { RoomQueue } from '../entities/room-queue.entity.js';
import { Track } from '../entities/track.entity.js';
import { PlayerModule } from '../player/player.module.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { SearchModule } from '../search/search.module.js';
import { QueueController } from './queue.controller.js';
import { QueueService } from './queue.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoomQueue, Track, RoomPermission, Room, RoomPlayback, RoomMember, PlayHistory]),
    RoomsModule,
    PlayerModule,
    SearchModule,
  ],
  controllers: [QueueController],
  providers: [QueueService],
})
export class QueueModule {}
