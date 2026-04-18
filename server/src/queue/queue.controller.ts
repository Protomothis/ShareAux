import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { THROTTLE_LIMIT_QUEUE_ADD, THROTTLE_TTL_MS } from '../constants.js';
import { RoomQueue } from '../entities/room-queue.entity.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RequirePermission, RoomPermissionGuard } from '../guards/room-permission.guard.js';
import { PlayerService } from '../player/player.service.js';
import { RoomsGateway } from '../rooms/rooms.gateway.js';
import { SearchService } from '../search/search.service.js';
import { AutoDjService } from '../services/auto-dj.service.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { Permission, WsEvent } from '../types/index.js';
import { AddTracksBody } from './dto/add-tracks-body.dto.js';
import { QuotaResponse } from './dto/quota-response.dto.js';
import { ReorderBody } from './dto/reorder-body.dto.js';
import { QueueService } from './queue.service.js';

@ApiTags('Queue')
@Controller('queue')
export class QueueController {
  constructor(
    private queue: QueueService,
    private player: PlayerService,
    private gateway: RoomsGateway,
    private search: SearchService,
    private autoDj: AutoDjService,
  ) {}

  @Get(':roomId')
  @ApiOperation({ summary: '대기열 조회' })
  @ApiResponse({ status: 200, type: [RoomQueue] })
  getQueue(@Param('roomId', ParseUUIDPipe) roomId: string) {
    return this.queue.getQueue(roomId);
  }

  @Get(':roomId/my-quota')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '내 곡 신청 쿼터 조회' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: QuotaResponse })
  getMyQuota(@Param('roomId', ParseUUIDPipe) roomId: string, @Req() req: AuthenticatedRequest) {
    return this.queue.getQuota(roomId, req.user.userId);
  }

  @Get(':roomId/history')
  @ApiOperation({ summary: '재생 기록 조회' })
  @ApiResponse({ status: 200, type: [RoomQueue] })
  getHistory(@Param('roomId', ParseUUIDPipe) roomId: string) {
    return this.queue.getHistory(roomId);
  }

  @Post(':roomId')
  @Throttle({ default: { ttl: THROTTLE_TTL_MS, limit: THROTTLE_LIMIT_QUEUE_ADD } })
  @RequirePermission(Permission.AddQueue)
  @UseGuards(JwtAuthGuard, RoomPermissionGuard)
  @ApiOperation({ summary: '곡 추가 (단건/일괄)' })
  @ApiBearerAuth()
  async addTracks(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: AddTracksBody,
    @Req() req: AuthenticatedRequest,
  ) {
    const entries = await this.queue.addTracks(roomId, body.trackIds, req.user.userId);
    const updatedQueue = await this.queue.getQueue(roomId);
    const addedTracks = updatedQueue.filter((q) => body.trackIds.includes(q.track.id)).map((q) => q.track);

    // Content ID 메타데이터 백그라운드 enrich
    const needsEnrich = addedTracks.filter((t) => t.metaStatus !== 'done');
    if (needsEnrich.length) {
      Promise.all(needsEnrich.map((t) => this.search.enrichTrackCredits(t.id, t.youtubeId)))
        .then(async () => {
          const [refreshed, status] = await Promise.all([this.queue.getQueue(roomId), this.player.getStatus(roomId)]);
          this.gateway.broadcastSystem(roomId, WsEvent.QueueUpdated, '', { queue: refreshed });
          // 재생 중인 곡의 메타데이터가 갱신됐으면 클라이언트에 알림
          if (status?.track) {
            const enriched = needsEnrich.find((t) => t.id === status.track.id);
            if (enriched) {
              const fresh = refreshed.find((q) => q.track.id === enriched.id)?.track;
              if (fresh?.songTitle) {
                this.gateway.broadcastSystem(roomId, WsEvent.MetadataUpdated, '', {
                  title: fresh.songTitle,
                  artist: fresh.songArtist,
                });
              }
            }
          }
        })
        .catch(() => {});
    }

    // codec/bitrate 미리 채우기
    for (const t of addedTracks.filter((t) => !t.codec)) {
      this.player.updateCodecInfo(t);
    }

    const nickname = req.user.nickname || '누군가';
    const msg =
      entries.length === 1
        ? `${nickname}님이 "${addedTracks[0]?.name ?? '곡'}"을(를) 추가했습니다`
        : `${nickname}님이 ${entries.length}곡을 추가했습니다`;
    this.gateway.broadcastSystem(roomId, WsEvent.QueueUpdated, '', { queue: updatedQueue });
    this.gateway.broadcastSystem(roomId, WsEvent.TrackAdded, msg);
    this.player.triggerPreload(roomId);
    this.autoPlayIfIdle(roomId, entries[0]?.track?.id ?? body.trackIds[0]);
    return entries;
  }

  @Delete(':roomId/:queueId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '곡 삭제' })
  @ApiBearerAuth()
  async removeTrack(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Param('queueId') queueId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.queue.removeTrack(roomId, queueId, req.user.userId);
    const updatedQueue = await this.queue.getQueue(roomId);
    this.gateway.broadcastSystem(roomId, WsEvent.QueueUpdated, '', { queue: updatedQueue });
    this.autoDj.trigger(roomId);
    return result;
  }

  @Put(':roomId/reorder')
  @RequirePermission(Permission.Host)
  @UseGuards(JwtAuthGuard, RoomPermissionGuard)
  @ApiOperation({ summary: '대기열 순서 변경' })
  @ApiBearerAuth()
  async reorder(@Param('roomId', ParseUUIDPipe) roomId: string, @Body() body: ReorderBody) {
    await this.queue.reorder(roomId, body.queueId, body.newPosition, body.version);
    const updatedQueue = await this.queue.getQueue(roomId);
    this.gateway.broadcastSystem(roomId, WsEvent.QueueUpdated, '', { queue: updatedQueue });
    return { success: true };
  }

  private autoPlayIfIdle(roomId: string, trackId: string) {
    void (async () => {
      const status = await this.player.getStatus(roomId);
      if (status?.isPlaying) return;
      await this.player.play(roomId, trackId).catch(() => {});
      const newStatus = await this.player.getStatus(roomId);
      this.gateway.broadcastSystem(roomId, WsEvent.PlaybackUpdated, '', newStatus);
      const refreshedQueue = await this.queue.getQueue(roomId);
      this.gateway.broadcastSystem(roomId, WsEvent.QueueUpdated, '', { queue: refreshedQueue });
    })();
  }
}
