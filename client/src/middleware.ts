import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const AUTH_COOKIE = 'sau';

/** 인증 불필요 경로 */
const PUBLIC_PATHS = ['/login', '/auth/callback', '/setup', '/privacy', '/terms'];

function isPublic(pathname: string): boolean {
  return pathname === '/' || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasAuth = req.cookies.has(AUTH_COOKIE);

  // 로그인 페이지 — 인증됐으면 /rooms로
  if (pathname === '/login' && hasAuth) {
    return NextResponse.redirect(new URL('/rooms', req.url));
  }

  // 공개 페이지 — 통과
  if (isPublic(pathname)) return NextResponse.next();

  // 보호 페이지 — 미인증이면 /login으로
  if (!hasAuth) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon\\.ico|og\\.png).*)'],
};
