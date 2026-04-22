import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { decodeJwt } from 'jose';

import { Language } from '@/api/model';

const SAT_COOKIE = 'sat';
const AUTH_INFO_COOKIE = '_sa_auth';
const LOCALE_COOKIE = 'locale';
const SUPPORTED_LOCALES = Object.values(Language);
const DEFAULT_LOCALE = Language.ko;

/** 인증 불필요 경로 */
const PUBLIC_PATHS = ['/login', '/auth/callback', '/setup', '/privacy', '/terms'];

function isPublic(pathname: string): boolean {
  return pathname === '/' || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function detectLocale(req: NextRequest): Language {
  const accept = req.headers.get('accept-language') ?? '';
  for (const part of accept.split(',')) {
    const lang = part.split(';')[0].trim().split('-')[0];
    if (SUPPORTED_LOCALES.includes(lang as Language)) return lang as Language;
  }
  return DEFAULT_LOCALE;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sat = req.cookies.get(SAT_COOKIE)?.value;
  const hasLocale = req.cookies.has(LOCALE_COOKIE);

  // 로그인 페이지 — 인증됐으면 /rooms로
  if (pathname === '/login' && sat) {
    const res = NextResponse.redirect(new URL('/rooms', req.url));
    if (!hasLocale) res.cookies.set(LOCALE_COOKIE, detectLocale(req), { path: '/', maxAge: 365 * 86400 });
    return res;
  }

  // 공개 페이지 — 통과
  if (isPublic(pathname)) {
    const res = NextResponse.next();
    if (!hasLocale) res.cookies.set(LOCALE_COOKIE, detectLocale(req), { path: '/', maxAge: 365 * 86400 });
    return res;
  }

  // 보호 페이지 — 미인증이면 /login으로
  if (!sat) {
    const res = NextResponse.redirect(new URL('/login', req.url));
    if (!hasLocale) res.cookies.set(LOCALE_COOKIE, detectLocale(req), { path: '/', maxAge: 365 * 86400 });
    return res;
  }

  // sat JWT에서 유저 정보 추출 → 클라이언트 읽기용 쿠키로 전달
  const res = NextResponse.next();
  if (!hasLocale) res.cookies.set(LOCALE_COOKIE, detectLocale(req), { path: '/', maxAge: 365 * 86400 });
  try {
    const payload = decodeJwt(sat);
    const info = JSON.stringify({
      sub: payload.sub,
      nickname: payload.nickname,
      role: payload.role,
    });
    res.cookies.set(AUTH_INFO_COOKIE, info, { path: '/', httpOnly: false, sameSite: 'lax' });
  } catch {
    // JWT 디코딩 실패 — 쿠키 삭제
    res.cookies.delete(AUTH_INFO_COOKIE);
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next|api|favicon\\.ico|og\\.png).*)'],
};
