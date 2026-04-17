import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { THROTTLE_LIMIT_SEARCH, THROTTLE_LIMIT_SUGGEST, THROTTLE_TTL_MS } from '../constants.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../types/auth.types.js';
import {
  PlaylistTracksResponse,
  RecommendedResponse,
  SearchResponse,
  ShowcaseResponse,
  SuggestResponse,
} from './dto/search-response.dto.js';
import { SearchService } from './search.service.js';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('suggest')
  @Throttle({ default: { ttl: THROTTLE_TTL_MS, limit: THROTTLE_LIMIT_SUGGEST } })
  @ApiOperation({ summary: '검색어 자동완성' })
  @ApiQuery({ name: 'q', required: true })
  @ApiResponse({ status: 200, type: SuggestResponse })
  async suggest(@Query('q') q: string): Promise<SuggestResponse> {
    if (!q) return { suggestions: [] };
    return this.searchService.suggest(q);
  }

  @Get()
  @Throttle({ default: { ttl: THROTTLE_TTL_MS, limit: THROTTLE_LIMIT_SEARCH } })
  @ApiOperation({ summary: '곡 + 플레이리스트 검색' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'continuation', required: false })
  @ApiResponse({ status: 200, type: SearchResponse })
  async search(@Query('q') q?: string, @Query('continuation') continuation?: string) {
    if (!q && !continuation) throw new BadRequestException('q or continuation is required');
    return this.searchService.searchWithContinuation(q ?? '', continuation);
  }

  @Get('showcase/:roomId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '쇼케이스 (인기곡/최근/내기록/추천)' })
  @ApiResponse({ status: 200, type: ShowcaseResponse })
  getShowcase(@Param('roomId', ParseUUIDPipe) roomId: string, @Req() req: AuthenticatedRequest) {
    return this.searchService.getShowcase(roomId, req.user.userId);
  }

  @Get('recommended/:roomId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '추천곡 (YouTube 관련 영상 기반)' })
  @ApiResponse({ status: 200, type: RecommendedResponse })
  getRecommended(@Param('roomId', ParseUUIDPipe) roomId: string) {
    return this.searchService.getRecommendedTracks(roomId);
  }

  @Get('playlist/:id')
  @ApiOperation({ summary: '플레이리스트 곡 목록 조회' })
  @ApiResponse({ status: 200, type: PlaylistTracksResponse })
  getPlaylistTracks(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.searchService.getPlaylistTracks(id, page, limit);
  }
}
