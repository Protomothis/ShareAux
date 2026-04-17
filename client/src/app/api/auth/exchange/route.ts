import { type NextRequest, NextResponse } from 'next/server';

const API = process.env.INTERNAL_API_URL || 'http://localhost:3000/api';

export async function POST(req: NextRequest) {
  const { code } = (await req.json()) as { code?: string };
  if (!code) return NextResponse.json({ message: 'Missing code' }, { status: 400 });

  const res = await fetch(`${API}/auth/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  }

  // NestJS Set-Cookie 헤더를 NextResponse에 직접 전달
  const response = NextResponse.json({ ok: true });
  for (const cookie of res.headers.getSetCookie()) {
    response.headers.append('Set-Cookie', cookie);
  }
  return response;
}
