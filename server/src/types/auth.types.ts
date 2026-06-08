import type { Request } from 'express';

import type { User } from '../entities/user.entity.js';
import type { AuthProvider } from './auth-provider.enum.js';
import type { UserRole } from './user-role.enum.js';

export interface JwtPayload {
  sub: string;
  email: string;
  nickname?: string;
  role?: UserRole;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  nickname: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/** Google OAuth 콜백에서 Passport가 설정하는 Request */
export interface GoogleCallbackRequest extends Request {
  user: User;
  googleLinked?: boolean;
}

export interface OAuthProfile {
  provider: AuthProvider;
  googleId: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
}
