import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TrackStats } from '../entities/track-stats.entity.js';
import { TrackVote } from '../entities/track-vote.entity.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { TracksController } from './tracks.controller.js';
import { TracksService } from './tracks.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([TrackVote, TrackStats]), RoomsModule],
  controllers: [TracksController],
  providers: [TracksService],
})
export class TracksModule {}
