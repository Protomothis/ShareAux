import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy, type VerifyCallback } from 'passport-google-oauth20';

import { SettingsService } from '../../services/settings.service.js';
import { AuthProvider } from '../../types/index.js';
import { OptionKey } from '../../types/settings.types.js';
import { AuthService } from '../auth.service.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly authService: AuthService,
    private readonly settings: SettingsService,
  ) {
    const clientID = settings.getSecret(OptionKey.GoogleClientId) || 'placeholder';
    const clientSecret = settings.getSecret(OptionKey.GoogleClientSecret) || 'placeholder';
    const callbackURL = settings.get(OptionKey.GoogleCallbackUrl) || 'http://localhost:3000/api/auth/google/callback';
    super({ clientID, clientSecret, callbackURL, scope: ['email', 'profile'], passReqToCallback: true });
    if (clientID === 'placeholder') {
      console.warn('[GoogleStrategy] Google OAuth credentials not set — disabled');
    }
  }

  /** 키 변경 시 Strategy 핫 리로드 */
  reinitialize(): void {
    const clientID = this.settings.getSecret(OptionKey.GoogleClientId) || 'placeholder';
    const clientSecret = this.settings.getSecret(OptionKey.GoogleClientSecret) || 'placeholder';
    const callbackURL =
      this.settings.get(OptionKey.GoogleCallbackUrl) || 'http://localhost:3000/api/auth/google/callback';
    // passport 내부 Strategy 옵션 교체
    (
      this as unknown as { _oauth2: { _clientId: string; _clientSecret: string }; _callbackURL: string }
    )._oauth2._clientId = clientID;
    (
      this as unknown as { _oauth2: { _clientId: string; _clientSecret: string }; _callbackURL: string }
    )._oauth2._clientSecret = clientSecret;
    (this as unknown as { _callbackURL: string })._callbackURL = callbackURL;
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

    if (state.startsWith('link:')) {
      const userId = state.slice(5);
      await this.authService.linkGoogle(userId, googleId, email);
      const user = await this.authService.findUserById(userId);
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
