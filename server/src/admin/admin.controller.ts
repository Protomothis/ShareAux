import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

import { InviteCode } from '../entities/invite-code.entity.js';
import { Room } from '../entities/room.entity.js';
import { User } from '../entities/user.entity.js';
import { AdminGuard } from '../guards/admin.guard.js';
import { AuditService } from '../services/audit.service.js';
import { ErrorLogService } from '../services/error-log.service.js';
import { IpBanService } from '../services/ip-ban.service.js';
import { MetricsService } from '../services/metrics.service.js';
import { SettingsService } from '../services/settings.service.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { Permission } from '../types/index.js';
import { THROTTLE_TTL_MS, WS_CLOSE_BANNED } from '../constants.js';
import { RoomsGateway } from '../rooms/rooms.gateway.js';
import { AdminService } from './admin.service.js';
import { AuditLogItem, PaginatedAuditLogsResponse } from './dto/audit-log-response.dto.js';
import { CleanupSummaryResponse } from './dto/cleanup-summary-response.dto.js';
import { CreateInviteCodeDto } from './dto/create-invite-code.dto.js';
import { CreateIpBanDto } from './dto/create-ip-ban.dto.js';
import { DashboardResponse } from './dto/dashboard-response.dto.js';
import { ErrorFileItem, ErrorLogItem, PaginatedErrorLogsResponse } from './dto/error-log-response.dto.js';
import { BannedIpItem, PaginatedBannedIpsResponse } from './dto/ip-ban-response.dto.js';
import { LiveRoomItem } from './dto/live-room-item.dto.js';
import { MetricsPointDto, RealtimeMetricsResponse } from './dto/metrics-response.dto.js';
import { PaginatedInviteCodesResponse } from './dto/paginated-invite-codes-response.dto.js';
import { AdminRoomItem, PaginatedRoomsResponse } from './dto/paginated-rooms-response.dto.js';
import { PaginatedUsersResponse } from './dto/paginated-users-response.dto.js';
import { DailyPlaysItem, PlaysMetricsResponse } from './dto/plays-metrics-response.dto.js';
import { PaginatedReportsResponse, ReportItem } from './dto/report-response.dto.js';
import { StreamingMetricsResponse } from './dto/streaming-metrics-response.dto.js';
import { SystemSettingItem, UpdateSettingsDto } from './dto/system-setting.dto.js';
import { SystemStatsResponse } from './dto/system-stats-response.dto.js';
import { TrackRankingItem } from './dto/track-ranking-item.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { UserDetailResponse } from './dto/user-detail-response.dto.js';
import { UsersBreakdownResponse } from './dto/users-breakdown-response.dto.js';

@ApiTags('Admin')
@ApiBearerAuth()
@ApiExtraModels(
  DashboardResponse,
  PaginatedUsersResponse,
  PaginatedRoomsResponse,
  AdminRoomItem,
  PaginatedInviteCodesResponse,
  SystemStatsResponse,
  UserDetailResponse,
  TrackRankingItem,
  LiveRoomItem,
  CleanupSummaryResponse,
  AuditLogItem,
  PaginatedAuditLogsResponse,
  ReportItem,
  PaginatedReportsResponse,
  SystemSettingItem,
  RealtimeMetricsResponse,
  MetricsPointDto,
  PlaysMetricsResponse,
  DailyPlaysItem,
  UsersBreakdownResponse,
  StreamingMetricsResponse,
  PaginatedErrorLogsResponse,
  ErrorLogItem,
  ErrorFileItem,
  BannedIpItem,
  PaginatedBannedIpsResponse,
)
@UseGuards(AdminGuard)
@Throttle({ default: { ttl: THROTTLE_TTL_MS, limit: 300 } })
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly gateway: RoomsGateway,
    private readonly settingsService: SettingsService,
    private readonly auditService: AuditService,
    private readonly metricsService: MetricsService,
    private readonly errorLogService: ErrorLogService,
    private readonly ipBanService: IpBanService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard stats' })
  @ApiOkResponse({ type: DashboardResponse })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  @ApiOperation({ summary: 'List users (paginated)' })
  @ApiOkResponse({ type: PaginatedUsersResponse })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'status', required: false })
  getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('provider') provider?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getUsers(page, limit, search, role, provider, status);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  @ApiOkResponse({ type: User })
  updateUserRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  @Patch('users/:id/permissions')
  @ApiOperation({ summary: '계정 권한 수정' })
  async updatePermissions(@Param('id') id: string, @Body('permissions') permissions: Permission[]) {
    await this.adminService.updateAccountPermissions(id, permissions);
    return { success: true };
  }

  @Post('users/:id/ban')
  @ApiOperation({ summary: '유저 밴' })
  async banUser(@Param('id') id: string) {
    await this.adminService.banUser(id);
    this.gateway.disconnectUser(id, WS_CLOSE_BANNED);
    return { success: true };
  }

  @Delete('users/:id/ban')
  @ApiOperation({ summary: '유저 밴 해제' })
  async unbanUser(@Param('id') id: string) {
    await this.adminService.unbanUser(id);
    return { success: true };
  }

  @Get('rooms')
  @ApiOperation({ summary: 'List rooms (paginated)' })
  @ApiOkResponse({ type: PaginatedRoomsResponse })
  getRooms(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getRooms(page, limit);
  }

  @Delete('rooms/:id')
  @ApiOperation({ summary: 'Delete a room' })
  @ApiOkResponse({ description: '방 삭제 완료' })
  deleteRoom(@Param('id') id: string) {
    return this.adminService.deleteRoom(id);
  }

  @Post('invite-codes')
  @ApiOperation({ summary: 'Create invite code' })
  @ApiOkResponse({ type: InviteCode })
  createInviteCode(@Body() dto: CreateInviteCodeDto, @Req() req: AuthenticatedRequest) {
    return this.adminService.createInviteCode(dto, req.user.userId);
  }

  @Get('invite-codes')
  @ApiOperation({ summary: 'List invite codes (paginated)' })
  @ApiOkResponse({ type: PaginatedInviteCodesResponse })
  getInviteCodes(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getInviteCodes(page, limit);
  }

  @Patch('invite-codes/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate an invite code' })
  @ApiOkResponse({ type: InviteCode })
  deactivateInviteCode(@Param('id') id: string) {
    return this.adminService.deactivateInviteCode(id);
  }

  @Delete('invite-codes/:id')
  @ApiOperation({ summary: 'Delete an invite code' })
  @ApiOkResponse({ description: '초대코드 삭제 완료' })
  deleteInviteCode(@Param('id') id: string) {
    return this.adminService.deleteInviteCode(id);
  }

  @Delete('invite-codes/expired-guests')
  @ApiOperation({ summary: 'Delete expired guest users (>12h)' })
  @ApiOkResponse({ description: '만료된 게스트 삭제 결과' })
  deleteExpiredGuests() {
    return this.adminService.deleteExpiredGuests();
  }

  @Get('tracks/ranking')
  @ApiOperation({ summary: '인기 트랙 순위' })
  @ApiOkResponse({ type: [TrackRankingItem] })
  getTopTracks(@Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number) {
    return this.adminService.getTopTracks(limit);
  }

  @Get('live-rooms')
  @ApiOperation({ summary: '실시간 활성 방 상태' })
  @ApiOkResponse({ type: [LiveRoomItem] })
  getLiveRooms() {
    return this.adminService.getLiveRooms();
  }

  @SkipThrottle()
  @Get('system-stats')
  @ApiOperation({ summary: '서버 리소스 모니터링' })
  @ApiOkResponse({ type: SystemStatsResponse })
  getSystemStats() {
    return this.adminService.getSystemStats();
  }

  @Get('users/:id/detail')
  @ApiOperation({ summary: '유저 상세 정보' })
  @ApiOkResponse({ type: UserDetailResponse })
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  // --- Metrics (throttle 제외 — 10초 폴링) ---

  @SkipThrottle()
  @Get('metrics/realtime')
  @ApiOperation({ summary: '실시간 메트릭' })
  @ApiOkResponse({ type: RealtimeMetricsResponse })
  @ApiQuery({ name: 'since', required: false })
  getRealtimeMetrics(@Query('since') since?: string) {
    return this.adminService.getRealtimeMetrics(since ? Number(since) : undefined);
  }

  @Get('metrics/plays')
  @ApiOperation({ summary: '일별 재생 수' })
  @ApiOkResponse({ type: PlaysMetricsResponse })
  @ApiQuery({ name: 'days', required: false })
  getDailyPlays(@Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number) {
    return this.adminService.getDailyPlays(days);
  }

  @Get('metrics/users-breakdown')
  @ApiOperation({ summary: '유저 분포' })
  @ApiOkResponse({ type: UsersBreakdownResponse })
  getUsersBreakdown() {
    return this.adminService.getUsersBreakdown();
  }

  @SkipThrottle()
  @Get('metrics/streaming')
  @ApiOperation({ summary: '스트리밍 현황' })
  @ApiOkResponse({ type: StreamingMetricsResponse })
  getStreamingMetrics() {
    return this.adminService.getStreamingMetrics();
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

  // --- Room Live Detail ---

  @Get('rooms/:id/live-detail')
  @ApiOperation({ summary: '방 실시간 상세' })
  getRoomLiveDetail(@Param('id') id: string) {
    return this.adminService.getRoomLiveDetail(id);
  }

  // --- System Settings ---

  @Get('settings')
  @ApiOperation({ summary: '시스템 설정 조회' })
  getSettings() {
    return this.settingsService.getAll();
  }

  @Patch('settings')
  @ApiOperation({ summary: '시스템 설정 일괄 수정' })
  async updateSettings(@Body() dto: UpdateSettingsDto, @Req() req: AuthenticatedRequest) {
    for (const [key, value] of Object.entries(dto.settings)) {
      await this.settingsService.set(key, value);
    }
    await this.auditService.log(req.user.userId, 'settings_update', 'system', null, dto.settings, req.ip);
    return { success: true };
  }

  // --- Cleanup ---

  @Get('cleanup/summary')
  @ApiOperation({ summary: '정리 대상 요약' })
  @ApiOkResponse({ type: CleanupSummaryResponse })
  getCleanupSummary() {
    return this.adminService.getCleanupSummary();
  }

  @Delete('cleanup/:type')
  @ApiOperation({ summary: '데이터 정리 실행' })
  async runCleanup(@Param('type') type: string, @Req() req: AuthenticatedRequest) {
    let deleted: number;
    switch (type) {
      case 'unplayed-tracks':
        deleted = await this.adminService.cleanupUnplayedTracks();
        break;
      case 'stale-tracks':
        deleted = await this.adminService.cleanupStaleTracks(30);
        break;
      case 'old-histories-30d':
        deleted = await this.adminService.cleanupOldHistories(30);
        break;
      case 'inactive-rooms-7d':
        deleted = await this.adminService.cleanupInactiveRooms(7);
        break;
      case 'empty-inactive-rooms':
        deleted = await this.adminService.cleanupEmptyInactiveRooms();
        break;
      case 'expired-guests':
        deleted = await this.adminService.cleanupExpiredGuests();
        break;
      case 'inactive-guests-30d':
        deleted = await this.adminService.cleanupInactiveGuests(30);
        break;
      default:
        throw new BadRequestException(`Unknown cleanup type: ${type}`);
    }
    await this.auditService.log(req.user.userId, 'cleanup', type, null, { deleted }, req.ip);
    return { deleted };
  }

  // --- IP Bans ---

  @Get('ip-bans')
  @ApiOperation({ summary: 'IP 차단 목록' })
  @ApiOkResponse({ type: PaginatedBannedIpsResponse })
  async getIpBans(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const { items, total } = await this.ipBanService.getAll(page, limit);
    return {
      items: items.map((b) => ({
        id: b.id,
        ip: b.ip,
        reason: b.reason,
        bannedBy: b.bannedBy,
        bannerNickname: b.banner?.nickname ?? null,
        expiresAt: b.expiresAt,
        createdAt: b.createdAt,
      })),
      total,
    };
  }

  @Post('ip-bans')
  @ApiOperation({ summary: 'IP 차단' })
  async createIpBan(@Body() dto: CreateIpBanDto, @Req() req: AuthenticatedRequest) {
    const ban = await this.ipBanService.banIp(
      dto.ip,
      dto.reason ?? null,
      req.user.userId,
      dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    );
    await this.auditService.log(req.user.userId, 'ip_ban', 'ip', null, { ip: dto.ip, reason: dto.reason }, req.ip);
    return ban;
  }

  @Delete('ip-bans/:id')
  @ApiOperation({ summary: 'IP 차단 해제' })
  async deleteIpBan(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.ipBanService.unbanIp(id);
    await this.auditService.log(req.user.userId, 'ip_unban', 'ip', id, undefined, req.ip);
    return { success: true };
  }

  // --- Audit Logs ---

  @Get('audit-logs')
  @ApiOperation({ summary: '감사 로그 조회' })
  @ApiOkResponse({ type: PaginatedAuditLogsResponse })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'targetType', required: false })
  getAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
  ) {
    return this.auditService.getAuditLogs(page, limit, { action, targetType });
  }

  // --- Reports ---

  @Get('reports')
  @ApiOperation({ summary: '신고 목록 조회' })
  @ApiOkResponse({ type: PaginatedReportsResponse })
  @ApiQuery({ name: 'status', required: false })
  getReports(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.adminService.getReports(page, limit, status);
  }

  @Patch('reports/:id/resolve')
  @ApiOperation({ summary: '신고 처리' })
  async resolveReport(@Param('id') id: string, @Body('status') status: string, @Req() req: AuthenticatedRequest) {
    if (status !== 'resolved' && status !== 'dismissed') {
      throw new BadRequestException('Status must be "resolved" or "dismissed"');
    }
    const report = await this.adminService.resolveReport(id, req.user.userId, status);
    await this.auditService.log(req.user.userId, 'report_resolve', 'report', id, { status }, req.ip);
    return report;
  }
}
