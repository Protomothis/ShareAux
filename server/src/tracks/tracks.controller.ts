import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { TrackStats } from '../entities/track-stats.entity.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RoomsGateway } from '../rooms/rooms.gateway.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';
import { WsEvent } from '../types/index.js';
import { VoteDto, VoteResponse } from './dto/vote.dto.js';
import { TracksService } from './tracks.service.js';

@ApiTags('Tracks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tracks')
export class TracksController {
  constructor(
    private readonly tracksService: TracksService,
    private readonly gateway: RoomsGateway,
  ) {}

  @Post(':id/vote')
  @ApiOperation({ summary: '곡 투표 (좋아요/싫어요, 토글)' })
  @ApiResponse({ status: 200, type: VoteResponse })
  async vote(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest, @Body() dto: VoteDto) {
    const result = await this.tracksService.vote(id, req.user.userId, dto.vote);
    this.gateway.broadcastSystem(dto.roomId, WsEvent.TrackVote, '', {
      trackId: id,
      likes: result.likes,
      dislikes: result.dislikes,
    });
    return result;
  }

  @Delete(':id/vote')
  @ApiOperation({ summary: '곡 투표 취소' })
  @ApiResponse({ status: 200, type: VoteResponse })
  removeVote(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.tracksService.removeVote(id, req.user.userId);
  }

  @Get(':id/vote')
  @ApiOperation({ summary: '내 투표 상태 조회' })
  @ApiResponse({ status: 200, type: VoteResponse })
  getMyVote(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.tracksService.getMyVote(id, req.user.userId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '곡 통계 조회' })
  @ApiResponse({ status: 200, type: TrackStats })
  getStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.tracksService.getStats(id);
  }
}
