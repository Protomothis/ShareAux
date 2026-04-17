import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InviteCode } from '../entities/invite-code.entity.js';
import { Report } from '../entities/report.entity.js';
import { Room } from '../entities/room.entity.js';
import { RoomMember } from '../entities/room-member.entity.js';
import { RoomPlayback } from '../entities/room-playback.entity.js';
import { RoomPlayHistory } from '../entities/room-play-history.entity.js';
import { RoomQueue } from '../entities/room-queue.entity.js';
import { Track } from '../entities/track.entity.js';
import { TrackStats } from '../entities/track-stats.entity.js';
import { TrackVote } from '../entities/track-vote.entity.js';
import { User } from '../entities/user.entity.js';
import { UserTrackHistory } from '../entities/user-track-history.entity.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { ReportController } from './report.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Room,
      RoomMember,
      InviteCode,
      Track,
      TrackStats,
      TrackVote,
      RoomQueue,
      RoomPlayHistory,
      RoomPlayback,
      UserTrackHistory,
      Report,
    ]),
    RoomsModule,
  ],
  controllers: [AdminController, ReportController],
  providers: [AdminService],
})
export class AdminModule {}
