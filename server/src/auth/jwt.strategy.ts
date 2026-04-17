import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AUTH_COOKIE_ACCESS } from '../constants.js';
import type { AuthenticatedUser, JwtPayload } from '../types/index.js';
import { UserRole } from '../types/index.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 쿠키 우선
        (req) => (req as unknown as { cookies?: Record<string, string> }).cookies?.[AUTH_COOKIE_ACCESS] ?? null,
        // Bearer header 하위 호환
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // query param 하위 호환 (sendBeacon 등)
        (req) => (req as unknown as { query?: { token?: string } }).query?.token ?? null,
      ]),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      email: payload.email,
      nickname: payload.nickname ?? payload.email?.split('@')[0] ?? '',
      role: payload.role ?? UserRole.User,
    };
  }
}
