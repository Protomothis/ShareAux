import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Room } from '../entities/room.entity.js';
import { RoomMember } from '../entities/room-member.entity.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { AutoDjService } from '../services/auto-dj.service.js';
import { ChatMuteService } from '../services/chat-mute.service.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { WsEvent } from '../types/index.js';
import { BanInfo } from './dto/ban-info.dto.js';
import { CreateRoomDto } from './dto/create-room.dto.js';
import { JoinRoomDto } from './dto/join-room.dto.js';
import { MyPermissionsResponse } from './dto/my-permissions-response.dto.js';
import { RoomDetail } from './dto/room-detail.dto.js';
import { RoomListItem } from './dto/room-list-item.dto.js';
import { UpdatePermissionsBody } from './dto/update-permissions-body.dto.js';
import { UpdateRoomDto } from './dto/update-room.dto.js';
import { ResetBansResponse, SanctionsResponse } from './dto/sanctions-response.dto.js';
import { RoomsGateway } from './rooms.gateway.js';
import { RoomsService } from './rooms.service.js';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(
    private rooms: RoomsService,
    private gateway: RoomsGateway,
    private autoDj: AutoDjService,
    private chatMute: ChatMuteService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '방 생성' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, type: Room })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateRoomDto) {
    const room = await this.rooms.create(req.user.userId, dto);
    if (room.autoDjEnabled) this.autoDj.trigger(room.id);
    return room;
  }

  @Get()
  @ApiOperation({ summary: '활성 방 목록' })
  @ApiResponse({ status: 200, type: [RoomListItem] })
  findAll() {
    return this.rooms.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '방 상세 조회' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: RoomDetail })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rooms.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '방 설정 수정' })
  @ApiBearerAuth()
  async update(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest, @Body() dto: UpdateRoomDto) {
    const result = await this.rooms.update(id, req.user.userId, dto);
    this.gateway.broadcastSystem(id, WsEvent.RoomUpdated, '');
    // AutoDJ 토글 시 즉시 트리거
    if (dto.autoDjEnabled !== undefined) {
      if (dto.autoDjEnabled) {
        this.autoDj.resetFailCount(id);
        this.autoDj.trigger(id);
        this.gateway.broadcastSystem(id, WsEvent.SystemMessage, '🤖 AutoDJ가 활성화되었습니다');
      } else {
        this.gateway.broadcastSystem(id, WsEvent.SystemMessage, '🤖 AutoDJ가 비활성화되었습니다');
      }
    } else if (result.autoDjEnabled && (dto.autoDjMode !== undefined || dto.autoDjFolderId !== undefined)) {
      // 모드/폴더 변경 시 재트리거
      this.autoDj.resetFailCount(id);
      this.autoDj.trigger(id);
    }
    return result;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '방 삭제' })
  @ApiBearerAuth()
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.rooms.remove(id, req.user.userId);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '방 입장' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, type: RoomMember })
  join(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest, @Body() dto: JoinRoomDto) {
    return this.rooms.join(id, req.user.userId, dto.password);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '방 퇴장' })
  @ApiBearerAuth()
  async leave(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.rooms.leave(id, req.user.userId);
    this.gateway.broadcastSystem(id, WsEvent.UserLeft, '멤버가 퇴장했습니다');
    if (result.roomClosed) {
      this.gateway.broadcastSystem(id, WsEvent.RoomClosed, '방이 종료되었습니다');
    } else if (result.hostChanged) {
      this.gateway.broadcastSystem(
        id,
        WsEvent.HostChanged,
        `${result.hostChanged.nickname}님이 새 호스트가 되었습니다`,
      );
    }
    return result;
  }

  @Get(':id/my-permissions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '내 실효 권한 조회' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: MyPermissionsResponse })
  async getMyPermissions(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.rooms.getEffectivePermissions(id, req.user.userId);
    return result;
  }

  @Put(':id/members/:userId/permissions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '멤버 권한 수정' })
  @ApiBearerAuth()
  async updatePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId') targetUserId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdatePermissionsBody,
  ) {
    const result = await this.rooms.updatePermissions(id, req.user.userId, targetUserId, body.permissions);
    this.gateway.broadcastSystem(id, WsEvent.RoomUpdated, '');
    this.gateway.sendToUser(id, targetUserId, WsEvent.PermissionChanged, '권한이 변경되었습니다');
    return result;
  }

  @Post(':id/reset-enqueue-counts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '곡 신청 횟수 초기화' })
  @ApiBearerAuth()
  async resetEnqueueCounts(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    await this.rooms.resetEnqueueCounts(id, req.user.userId);
    this.gateway.broadcastSystem(id, WsEvent.EnqueueCountsReset, '곡 신청 횟수가 초기화되었습니다');
    return { ok: true };
  }

  @Post(':id/transfer-host/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'DJ 위임' })
  @ApiBearerAuth()
  async transferHost(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId') targetUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const newHost = await this.rooms.transferHostTo(id, req.user.userId, targetUserId);
    this.gateway.broadcastSystem(id, WsEvent.HostChanged, `${newHost.nickname}님이 새 DJ가 되었습니다`);
    this.gateway.sendToUser(id, targetUserId, WsEvent.PermissionChanged, 'DJ 권한을 위임받았습니다');
    return { ok: true };
  }

  @Post(':id/kick/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '멤버 추방' })
  @ApiBearerAuth()
  async kick(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId') targetUserId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.rooms.kick(id, req.user.userId, targetUserId);
    this.gateway.kickUser(id, targetUserId);
    this.gateway.broadcastSystem(id, WsEvent.UserKicked, '멤버가 추방되었습니다');
    return { ok: true };
  }

  @Post(':id/reset-bans')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '밴 초기화' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, type: ResetBansResponse })
  async resetBans(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    const count = await this.rooms.resetBans(id, req.user.userId);
    return { ok: true, cleared: count };
  }

  @Get(':id/bans')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '밴 목록 조회' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: [BanInfo] })
  getBans(@Param('id', ParseUUIDPipe) id: string) {
    return this.rooms.getBans(id);
  }

  @Delete(':id/bans/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '밴 해제' })
  @ApiBearerAuth()
  async unban(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.rooms.unban(id, req.user.userId, userId);
    return { ok: true };
  }

  @Get(':id/sanctions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '제재 목록 (추방 + 채팅 제한)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: SanctionsResponse })
  async getSanctions(@Param('id', ParseUUIDPipe) id: string) {
    const [bans, mutes] = await Promise.all([this.rooms.getBans(id), Promise.resolve(this.chatMute.getMutes(id))]);
    return {
      bans: bans.map((b) => ({ ...b, type: 'ban' as const })),
      mutes: mutes.map((m) => ({ ...m, type: 'mute' as const })),
    };
  }

  @Post(':id/mute/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '채팅 제한' })
  @ApiBearerAuth()
  async muteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('seconds') seconds: number,
  ) {
    this.chatMute.manualMute(id, userId, seconds || 300);
    return { success: true };
  }

  @Delete(':id/mute/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '채팅 제한 해제' })
  @ApiBearerAuth()
  async unmuteUser(@Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string) {
    this.chatMute.unmute(id, userId);
    return { success: true };
  }
}
