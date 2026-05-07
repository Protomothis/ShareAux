import { Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

import { THROTTLE_TTL_MS } from '../constants.js';
import { AppException } from '../exceptions/app.exception.js';
import { AdminGuard } from '../guards/admin.guard.js';
import { AuditService } from '../services/audit.service.js';
import { ErrorLogService } from '../services/error-log.service.js';
import { ErrorCode } from '../types/error-code.enum.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { AdminCleanupService } from './admin-cleanup.service.js';
import { AdminMetricsService } from './admin-metrics.service.js';
import { CleanupSummaryResponse } from './dto/cleanup-summary-response.dto.js';
import { ErrorFileItem, PaginatedErrorLogsResponse } from './dto/error-log-response.dto.js';
import { LiveRoomItem } from './dto/live-room-item.dto.js';
import { RealtimeMetricsResponse } from './dto/metrics-response.dto.js';
import { PlaysMetricsResponse } from './dto/plays-metrics-response.dto.js';
import { StreamingMetricsResponse } from './dto/streaming-metrics-response.dto.js';
import { SystemStatsResponse } from './dto/system-stats-response.dto.js';
import { UsersBreakdownResponse } from './dto/users-breakdown-response.dto.js';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Throttle({ default: { ttl: THROTTLE_TTL_MS, limit: 300 } })
@Controller('admin')
export class AdminMetricsController {
  constructor(
    private readonly metricsService: AdminMetricsService,
    private readonly cleanupService: AdminCleanupService,
    private readonly errorLogService: ErrorLogService,
    private readonly auditService: AuditService,
  ) {}

  // --- System Stats ---

  @SkipThrottle()
  @Get('system-stats')
  @ApiOperation({ summary: '서버 리소스 모니터링' })
  @ApiOkResponse({ type: SystemStatsResponse })
  getSystemStats() {
    return this.metricsService.getSystemStats();
  }

  // --- Live Rooms ---

  @Get('live-rooms')
  @ApiOperation({ summary: '실시간 활성 방 상태' })
  @ApiOkResponse({ type: [LiveRoomItem] })
  getLiveRooms() {
    return this.metricsService.getLiveRooms();
  }

  @Get('rooms/:id/live-detail')
  @ApiOperation({ summary: '방 실시간 상세' })
  getRoomLiveDetail(@Param('id') id: string) {
    return this.metricsService.getRoomLiveDetail(id);
  }

  // --- Metrics ---

  @SkipThrottle()
  @Get('metrics/realtime')
  @ApiOperation({ summary: '실시간 메트릭' })
  @ApiOkResponse({ type: RealtimeMetricsResponse })
  @ApiQuery({ name: 'since', required: false })
  getRealtimeMetrics(@Query('since') since?: string) {
    return this.metricsService.getRealtimeMetrics(since ? Number(since) : undefined);
  }

  @Get('metrics/plays')
  @ApiOperation({ summary: '일별 재생 수' })
  @ApiOkResponse({ type: PlaysMetricsResponse })
  @ApiQuery({ name: 'days', required: false })
  getDailyPlays(@Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number) {
    return this.metricsService.getDailyPlays(days);
  }

  @Get('metrics/users-breakdown')
  @ApiOperation({ summary: '유저 분포' })
  @ApiOkResponse({ type: UsersBreakdownResponse })
  getUsersBreakdown() {
    return this.metricsService.getUsersBreakdown();
  }

  @SkipThrottle()
  @Get('metrics/streaming')
  @ApiOperation({ summary: '스트리밍 현황' })
  @ApiOkResponse({ type: StreamingMetricsResponse })
  getStreamingMetrics() {
    return this.metricsService.getStreamingMetrics();
  }

  // --- Error Logs ---

  @Get('errors')
  @ApiOperation({ summary: '최근 에러 로그' })
  @ApiOkResponse({ type: PaginatedErrorLogsResponse })
  getRecentErrors(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.errorLogService.getRecentErrors(page, limit);
  }

  @Get('errors/files')
  @ApiOperation({ summary: '에러 로그 파일 목록' })
  @ApiOkResponse({ type: [ErrorFileItem] })
  getErrorFiles() {
    return this.errorLogService.getErrorFiles();
  }

  @Get('errors/files/:filename')
  @ApiOperation({ summary: '에러 로그 파일 조회' })
  @ApiOkResponse({ type: PaginatedErrorLogsResponse })
  getErrorFile(
    @Param('filename') filename: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.errorLogService.getErrorFile(filename, page, limit);
  }

  // --- Cleanup ---

  @Get('cleanup/summary')
  @ApiOperation({ summary: '정리 대상 요약' })
  @ApiOkResponse({ type: CleanupSummaryResponse })
  getCleanupSummary() {
    return this.cleanupService.getCleanupSummary();
  }

  @Delete('cleanup/:type')
  @ApiOperation({ summary: '데이터 정리 실행' })
  async runCleanup(@Param('type') type: string, @Req() req: AuthenticatedRequest) {
    let deleted: number;
    switch (type) {
      case 'unplayed-tracks':
        deleted = await this.cleanupService.cleanupUnplayedTracks();
        break;
      case 'stale-tracks':
        deleted = await this.cleanupService.cleanupStaleTracks(30);
        break;
      case 'old-histories-30d':
        deleted = await this.cleanupService.cleanupOldHistories(30);
        break;
      case 'inactive-rooms-7d':
        deleted = await this.cleanupService.cleanupInactiveRooms(7);
        break;
      case 'empty-inactive-rooms':
        deleted = await this.cleanupService.cleanupEmptyInactiveRooms();
        break;
      case 'expired-guests':
        deleted = await this.cleanupService.cleanupExpiredGuests();
        break;
      case 'inactive-guests-30d':
        deleted = await this.cleanupService.cleanupInactiveGuests(30);
        break;
      default:
        throw new AppException(ErrorCode.ADMIN_007);
    }
    await this.auditService.log(req.user.userId, 'cleanup', type, null, { deleted }, req.ip);
    return { deleted };
  }
}
