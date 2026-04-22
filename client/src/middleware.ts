import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { decodeJwt } from 'jose';

const SAT_COOKIE = 'sat';
const AUTH_INFO_COOKIE = '_sa_auth';

/** 인증 불필요 경로 */
const PUBLIC_PATHS = ['/login', '/auth/callback', '/setup', '/privacy', '/terms'];

function isPublic(pathname: string): boolean {
  return pathname === '/' || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sat = req.cookies.get(SAT_COOKIE)?.value;

  // 로그인 페이지 — 인증됐으면 /rooms로
  if (pathname === '/login' && sat) {
    return NextResponse.redirect(new URL('/rooms', req.url));
  }

  // 공개 페이지 — 통과
  if (isPublic(pathname)) return NextResponse.next();

  // 보호 페이지 — 미인증이면 /login으로
  if (!sat) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // sat JWT에서 유저 정보 추출 → 클라이언트 읽기용 쿠키로 전달
  const res = NextResponse.next();
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
