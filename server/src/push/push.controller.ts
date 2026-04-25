import { Body, Controller, Delete, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { SubscribePushDto } from './dto/subscribe-push.dto.js';
import { UpdatePushSettingsDto } from './dto/update-push-settings.dto.js';
import { VapidKeyResponse } from './dto/vapid-key-response.dto.js';
import { PushService } from './push.service.js';

@ApiTags('push')
@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly push: PushService) {}

  /** VAPID public key (클라이언트 구독 시 필요) */
  @Get('vapid-key')
  @ApiResponse({ status: 200, type: VapidKeyResponse })
  getVapidKey(): VapidKeyResponse {
    return { key: this.push.getVapidPublicKey() };
  }

  /** Push 구독 등록 */
  @Post('subscribe')
  async subscribe(@Req() req: AuthenticatedRequest, @Body() dto: SubscribePushDto) {
    await this.push.subscribe(req.user.userId, dto.endpoint, dto.p256dh, dto.auth, dto.locale);
    // 등록 확인용 테스트 Push
    await this.push.sendTestPush(req.user.userId);
    return { ok: true };
  }

  /** Push 구독 해제 */
  @Delete('subscribe')
  async unsubscribe(@Req() req: AuthenticatedRequest, @Body() dto: Pick<SubscribePushDto, 'endpoint'>) {
    await this.push.unsubscribe(req.user.userId, dto.endpoint);
    return { ok: true };
  }

  /** 알림 설정 조회 */
  @Get('settings')
  getSettings(@Req() req: AuthenticatedRequest) {
    return this.push.getSettings(req.user.userId);
  }

  /** 알림 설정 변경 */
  @Patch('settings')
  updateSettings(@Req() req: AuthenticatedRequest, @Body() dto: UpdatePushSettingsDto) {
    return this.push.updateSettings(req.user.userId, dto);
  }
}
