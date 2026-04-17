import type { Request } from 'express';

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

export interface OAuthProfile {
  provider: AuthProvider;
  googleId: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
}
