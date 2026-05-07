import { Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { THROTTLE_TTL_MS } from '../constants.js';
import { AdminGuard } from '../guards/admin.guard.js';
import { AdminTracksService } from './admin-tracks.service.js';
import { PaginatedTrackRankingResponse } from './dto/paginated-track-ranking-response.dto.js';
import { TrackLyricsResponse } from './dto/track-lyrics-response.dto.js';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Throttle({ default: { ttl: THROTTLE_TTL_MS, limit: 300 } })
@Controller('admin')
export class AdminTracksController {
  constructor(private readonly tracksService: AdminTracksService) {}

  @Get('tracks/ranking')
  @ApiOperation({ summary: '인기 트랙 순위' })
  @ApiOkResponse({ type: PaginatedTrackRankingResponse })
  getTopTracks(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.tracksService.getTopTracks(page, limit);
  }

  @Get('tracks/:id/lyrics')
  @ApiOperation({ summary: '트랙 가사 조회' })
  @ApiOkResponse({ type: TrackLyricsResponse })
  async getTrackLyrics(@Param('id') id: string): Promise<TrackLyricsResponse> {
    return this.tracksService.getTrackLyrics(id);
  }

  @Delete('tracks/:id/lyrics')
  @ApiOperation({ summary: '트랙 가사 초기화' })
  async resetTrackLyrics(@Param('id') id: string) {
    await this.tracksService.resetTrackLyrics(id);
    return { ok: true };
  }

  @Delete('tracks/:id/meta')
  @ApiOperation({ summary: '트랙 Content ID 메타 초기화' })
  async resetTrackMeta(@Param('id') id: string) {
    await this.tracksService.resetTrackMeta(id);
    return { ok: true };
  }

  @Delete('tracks/:id')
  @ApiOperation({ summary: '트랙 삭제' })
  async deleteTrack(@Param('id') id: string) {
    await this.tracksService.deleteTrack(id);
    return { ok: true };
  }
}
