import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoomMember } from '../entities/room-member.entity.js';
import { RoomPlayback } from '../entities/room-playback.entity.js';
import { RoomPlayHistory } from '../entities/room-play-history.entity.js';
import { RoomQueue } from '../entities/room-queue.entity.js';
import { Track } from '../entities/track.entity.js';
import { TrackStats } from '../entities/track-stats.entity.js';
import { UserTrackHistory } from '../entities/user-track-history.entity.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { LyricsService } from '../services/lyrics.service.js';
import { PlayerController } from './player.controller.js';
import { PlayerService } from './player.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoomPlayback,
      RoomPlayHistory,
      RoomQueue,
      RoomMember,
      Track,
      TrackStats,
      UserTrackHistory,
    ]),
    RoomsModule,
  ],
  controllers: [PlayerController],
  providers: [PlayerService, LyricsService],
  exports: [PlayerService],
})
export class PlayerModule {}
