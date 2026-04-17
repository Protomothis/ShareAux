import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy, type VerifyCallback } from 'passport-google-oauth20';

import { AuthProvider } from '../../types/index.js';
import { AuthService } from '../auth.service.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly authService: AuthService,
    config: ConfigService,
  ) {
    const clientID = config.get<string>('GOOGLE_CLIENT_ID', '');
    super({
      clientID: clientID || 'placeholder',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET', '') || 'placeholder',
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL', '') || 'http://localhost:3000/api/auth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
    if (!clientID) {
      console.warn('[GoogleStrategy] GOOGLE_CLIENT_ID not set — Google OAuth disabled');
    }
  }

  async validate(
    req: Request,
    _accessToken: string,
    _refreshToken: string,
    profile: { id?: string; emails?: { value: string }[]; displayName?: string; photos?: { value: string }[] },
    done: VerifyCallback,
  ) {
    const googleId = profile.id ?? profile.emails?.[0]?.value ?? '';
    const email = profile.emails?.[0]?.value ?? '';
    const state = (req.query as Record<string, string>).state ?? '';

    // link flow: state = "link:<userId>"
    if (state.startsWith('link:')) {
      const userId = state.slice(5);
      await this.authService.linkGoogle(userId, googleId, email);
      const user = await this.authService.findUserById(userId);
      // 연동 완료 표시를 위해 req에 플래그 설정
      (req as unknown as Record<string, unknown>).googleLinked = true;
      done(null, user ?? false);
      return;
    }

    const user = await this.authService.validateOAuthUser({
      provider: AuthProvider.Google,
      googleId,
      email,
      nickname: profile.displayName ?? '',
      avatarUrl: profile.photos?.[0]?.value,
    });
    done(null, user);
  }
}
