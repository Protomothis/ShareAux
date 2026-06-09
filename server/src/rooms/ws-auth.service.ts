import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { IncomingMessage } from 'http';

import { AUTH_COOKIE_ACCESS, IS_DEV } from '../constants.js';
import { IpBanService } from '../services/ip-ban.service.js';
import type { JwtPayload } from '../types/index.js';

export interface WsUpgradeCheckResult {
  allowed: boolean;
  ip: string;
}

export interface WsAuthResult {
  ok: true;
  payload: JwtPayload;
  roomId: string;
  token: string;
}

export interface WsAuthFailure {
  ok: false;
  reason: string;
}

@Injectable()
export class WsAuthService {
  private readonly logger = new Logger(WsAuthService.name);
  private readonly allowedOrigin: string | undefined;
  private readonly WS_RATE_WINDOW_MS = 10_000;
  private readonly WS_RATE_LIMIT = 10;
  private connectAttempts = new Map<string, { count: number; resetAt: number; violations: number }>();

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private ipBan: IpBanService,
  ) {
    this.allowedOrigin = this.config.get<string>('CLIENT_URL');
  }

  /** IP 추출 */
  extractIp(req: IncomingMessage): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? '';
  }

  /** upgrade 단계에서 IP ban + Origin + rate limit 검증 */
  checkUpgrade(req: IncomingMessage): WsUpgradeCheckResult {
    const ip = this.extractIp(req);

    if (this.ipBan.isIpBanned(ip)) return { allowed: false, ip };

    // CSWSH 방지
    const origin = req.headers.origin;
    const skipOriginCheck = IS_DEV && this.config.get<string>('DEV_WS_ORIGIN_CHECK') !== 'true';
    if (!skipOriginCheck && this.allowedOrigin && origin && !origin.startsWith(this.allowedOrigin)) {
      this.logger.warn(`WS upgrade rejected: origin=${origin}`);
      return { allowed: false, ip };
    }

    // 미인증 rate limit
    const hasCookie = !!req.headers.cookie?.includes('sat=');
    if (!hasCookie) {
      const now = Date.now();
      let entry = this.connectAttempts.get(ip);
      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + this.WS_RATE_WINDOW_MS, violations: entry?.violations ?? 0 };
        this.connectAttempts.set(ip, entry);
      }
      entry.count++;
      if (entry.count > this.WS_RATE_LIMIT) {
        entry.violations++;
        if (entry.violations >= 10) {
          void this.ipBan.banIp(ip, 'WS flood (auto)', 'system', new Date(now + 24 * 60 * 60_000));
        } else if (entry.violations >= 3) {
          void this.ipBan.banIp(ip, 'WS flood (auto)', 'system', new Date(now + 30 * 60_000));
        }
        return { allowed: false, ip };
      }
    }

    return { allowed: true, ip };
  }

  /** JWT 검증 + roomId/token 추출 */
  authenticate(req: IncomingMessage): WsAuthResult | WsAuthFailure {
    const params = new URLSearchParams(req.url?.split('?')[1] ?? '');
    const roomId = params.get('roomId');
    const cookieToken = req.headers.cookie
      ?.split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${AUTH_COOKIE_ACCESS}=`))
      ?.split('=')[1];
    const token = cookieToken ?? params.get('token');

    if (!token || !roomId) return { ok: false, reason: 'Missing token or roomId' };

    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      return { ok: true, payload, roomId, token };
    } catch {
      return { ok: false, reason: 'Invalid token' };
    }
  }

  /** heartbeat 타이머용: 만료된 rate-limit 엔트리 정리 */
  cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [ip, entry] of this.connectAttempts) {
      if (now > entry.resetAt) this.connectAttempts.delete(ip);
    }
  }
}
