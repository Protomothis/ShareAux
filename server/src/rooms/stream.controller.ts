import { Controller, Get, Logger, Param, ParseUUIDPipe, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';

import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { AudioService } from '../services/audio.service.js';
import type { AuthenticatedRequest, JwtPayload } from '../types/index.js';
import { MemberService } from './member.service.js';

/** stream token 만료: 1시간 */
const STREAM_TOKEN_EXPIRY_SEC = 3600;

@Controller('rooms')
export class StreamController {
  private readonly logger = new Logger(StreamController.name);

  constructor(
    private readonly audio: AudioService,
    private readonly jwt: JwtService,
    private readonly members: MemberService,
  ) {}

  // --- Stream Token 발급 ---

  @Get(':id/stream-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '스트림 전용 토큰 발급 (Cast/AirPlay용)' })
  @ApiResponse({ status: 200, schema: { properties: { token: { type: 'string' } } } })
  async getStreamToken(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ token: string }> {
    const token = this.jwt.sign(
      { sub: req.user.userId, roomId: id, purpose: 'stream' },
      { expiresIn: STREAM_TOKEN_EXPIRY_SEC },
    );
    return { token };
  }

  // --- Stream 엔드포인트 ---

  @Get(':id/stream')
  @SkipThrottle()
  @ApiExcludeEndpoint()
  async stream(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    // stream token 검증 (query param 필수)
    if (!token) {
      res.status(401).end();
      return;
    }

    let payload: JwtPayload & { roomId?: string; purpose?: string };
    try {
      payload = this.jwt.verify(token);
    } catch {
      res.status(401).end();
      return;
    }

    // stream 전용 토큰 + 방 ID 일치 확인
    if (payload.purpose !== 'stream' || payload.roomId !== id) {
      res.status(403).end();
      return;
    }

    // 방 활성 확인
    const memberCount = await this.members.getMemberCount(id);
    if (memberCount === 0) {
      res.status(404).end();
      return;
    }

    // HTTP chunked stream 시작
    res.setHeader('Content-Type', 'audio/mp4');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const added = this.audio.addHttpListener(id, res);
    if (!added) {
      res.status(204).end();
      return;
    }

    this.logger.log(`[${id}] HTTP stream started for user ${payload.sub}`);
  }
}
