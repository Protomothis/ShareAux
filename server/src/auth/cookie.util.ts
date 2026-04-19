import type { CookieOptions, Response } from 'express';

import {
  AUTH_ACCESS_EXPIRY_SEC,
  AUTH_COOKIE_ACCESS,
  AUTH_COOKIE_REFRESH,
  AUTH_COOKIE_USER,
  AUTH_REFRESH_EXPIRY_SEC,
} from '../constants.js';

export interface UserCookiePayload {
  sub: string;
  nickname: string;
  role: string;
}

function buildOptions(isProd: boolean, maxAgeSec: number, httpOnly: boolean): CookieOptions {
  return {
    httpOnly,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec * 1000,
  };
}

export function setAuthCookies(
  res: Response,
  isProd: boolean,
  accessToken: string,
  refreshToken: string,
  user: UserCookiePayload,
): void {
  res.cookie(AUTH_COOKIE_ACCESS, accessToken, buildOptions(isProd, AUTH_ACCESS_EXPIRY_SEC, true));
  res.cookie(AUTH_COOKIE_REFRESH, refreshToken, {
    ...buildOptions(isProd, AUTH_REFRESH_EXPIRY_SEC, true),
    path: '/api/auth/refresh',
  });
  res.cookie(AUTH_COOKIE_USER, JSON.stringify(user), buildOptions(isProd, AUTH_ACCESS_EXPIRY_SEC, false));
}

export function clearAuthCookies(res: Response, isProd: boolean): void {
  const clear = (name: string, path = '/') =>
    res.clearCookie(name, { httpOnly: true, secure: isProd, sameSite: 'lax', path });
  clear(AUTH_COOKIE_ACCESS);
  clear(AUTH_COOKIE_REFRESH, '/api/auth/refresh');
  res.clearCookie(AUTH_COOKIE_USER, { secure: isProd, sameSite: 'lax', path: '/' });
}
