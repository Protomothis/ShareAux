const SAU_COOKIE = 'sau';

export interface DecodedToken {
  sub: string;
  nickname: string;
  role?: string;
  email?: string;
}

/** sau 쿠키에서 유저 정보 파싱 (비-httpOnly 메타 쿠키) */
export function decodeToken(): DecodedToken | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${SAU_COOKIE}=`));
  if (!match) return null;
  try {
    const raw = decodeURIComponent(match.split('=').slice(1).join('='));
    const data = JSON.parse(raw) as { sub?: string; nickname?: string; role?: string };
    if (!data.sub) return null;
    return { sub: data.sub, nickname: data.nickname ?? data.sub.slice(0, 8), role: data.role };
  } catch {
    return null;
  }
}
