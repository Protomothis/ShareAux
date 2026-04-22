import type { CookieOptions, Response } from 'express';

import {
  AUTH_ACCESS_EXPIRY_SEC,
  AUTH_COOKIE_ACCESS,
  AUTH_COOKIE_REFRESH,
  AUTH_REFRESH_EXPIRY_SEC,
} from '../constants.js';

function buildOptions(isProd: boolean, maxAgeSec: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec * 1000,
  };
}

export function setAuthCookies(res: Response, isProd: boolean, accessToken: string, refreshToken: string): void {
  res.cookie(AUTH_COOKIE_ACCESS, accessToken, buildOptions(isProd, AUTH_ACCESS_EXPIRY_SEC));
  res.cookie(AUTH_COOKIE_REFRESH, refreshToken, {
    ...buildOptions(isProd, AUTH_REFRESH_EXPIRY_SEC),
    path: '/api/auth/refresh',
  });
}

export function clearAuthCookies(res: Response, isProd: boolean): void {
  const clear = (name: string, path = '/') =>
    res.clearCookie(name, { httpOnly: true, secure: isProd, sameSite: 'lax', path });
  clear(AUTH_COOKIE_ACCESS);
  clear(AUTH_COOKIE_REFRESH, '/api/auth/refresh');
}
