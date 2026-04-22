const AUTH_INFO_COOKIE = '_sa_auth';

export interface DecodedToken {
  sub: string;
  nickname: string;
  role?: string;
}

/** middleware가 주입한 _sa_auth 쿠키에서 유저 정보 파싱 */
export function decodeToken(): DecodedToken | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${AUTH_INFO_COOKIE}=`));
  if (!match) return null;
  try {
    const raw = decodeURIComponent(match.split('=').slice(1).join('='));
    const data = JSON.parse(raw) as { sub?: string; nickname?: string; role?: string };
    if (!data.sub) return null;
    return { sub: data.sub, nickname: data.nickname ?? '', role: data.role };
  } catch {
    return null;
  }
}
