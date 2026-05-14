import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RequirePermission, RoomPermissionGuard } from '../guards/room-permission.guard.js';
import { AutoDjService } from '../services/auto-dj.service.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { Permission, WsEvent } from '../types/index.js';
import { AutoDjCandidatesResponse } from './dto/auto-dj-candidates.dto.js';
import { RoomsGateway } from './rooms.gateway.js';
import { RoomsService } from './rooms.service.js';

@ApiTags('AutoDJ')
@Controller('rooms/:id/autodj')
export class AutoDjController {
  constructor(
    private readonly rooms: RoomsService,
    private readonly gateway: RoomsGateway,
    private readonly autoDj: AutoDjService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get('candidates')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'AutoDJ 후보 조회' })
  @ApiResponse({ status: 200, type: AutoDjCandidatesResponse })
  @ApiBearerAuth()
  getCandidates(@Param('id', ParseUUIDPipe) id: string): AutoDjCandidatesResponse {
    const entries = this.autoDj.getPoolCandidates(id);
    return {
      candidates: entries.map((e) => ({
        id: e.track.id,
        name: e.track.songTitle ?? e.track.name,
        artist: e.track.songArtist ?? e.track.artist,
        thumbnail: e.track.thumbnail,
        pinned: e.pinned,
      })),
    };
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard, RoomPermissionGuard)
  @RequirePermission(Permission.Host)
  @ApiOperation({ summary: 'AutoDJ 풀 새로고침' })
  @ApiBearerAuth()
  async refresh(@Param('id', ParseUUIDPipe) id: string) {
    await this.autoDj.refreshPool(id);
    return { success: true };
  }

  @Post('pin/:trackId')
  @UseGuards(JwtAuthGuard, RoomPermissionGuard)
  @RequirePermission(Permission.Host)
  @ApiOperation({ summary: 'AutoDJ 후보 핀 토글' })
  @ApiBearerAuth()
  pin(@Param('id', ParseUUIDPipe) id: string, @Param('trackId', ParseUUIDPipe) trackId: string) {
    this.autoDj.pinAiCandidate(id, trackId);
    return { success: true };
  }

  @Delete('skip/:trackId')
  @UseGuards(JwtAuthGuard, RoomPermissionGuard)
  @RequirePermission(Permission.Host)
  @ApiOperation({ summary: 'AutoDJ 후보 스킵' })
  @ApiBearerAuth()
  skip(@Param('id', ParseUUIDPipe) id: string, @Param('trackId', ParseUUIDPipe) trackId: string) {
    this.autoDj.skipAiCandidate(id, trackId);
    return { success: true };
  }

  @Post('enqueue/:trackId')
  @UseGuards(JwtAuthGuard, RoomPermissionGuard)
  @RequirePermission(Permission.Host)
  @ApiOperation({ summary: 'AutoDJ 후보를 큐에 즉시 추가' })
  @ApiBearerAuth()
  async enqueue(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('trackId', ParseUUIDPipe) trackId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const track = this.autoDj.removeCandidate(id, trackId);
    if (!track) throw new BadRequestException('Candidate not found');
    this.eventEmitter.emit('autodj.enqueue', { roomId: id, track, userId: req.user.userId });
    return { success: true };
  }

  @Post('pause')
  @UseGuards(JwtAuthGuard, RoomPermissionGuard)
  @RequirePermission(Permission.Host)
  @ApiOperation({ summary: 'AutoDJ 일시중지 토글' })
  @ApiBearerAuth()
  async togglePause(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    const room = await this.rooms.findOne(id);
    const paused = !room.autoDjPaused;
    await this.rooms.update(id, req.user.userId, { autoDjPaused: paused });
    this.gateway.broadcastSystem(id, WsEvent.RoomUpdated, '');
    if (!paused) this.autoDj.trigger(id);
    return { paused };
  }
}
