const MAX_RETRIES = 10;
const RETRY_INTERVAL = 2000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const url = process.env.INTERNAL_API_URL || 'http://localhost:3000/api';
  const healthUrl = `${url}/health`;

  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        console.log(`✅ API 서버 연결 성공 (${url})`);
        return;
      }
      console.warn(`⏳ API 서버 응답 이상 (${res.status}), 재시도 ${i}/${MAX_RETRIES}...`);
    } catch {
      console.warn(`⏳ API 서버 연결 대기 중... (${i}/${MAX_RETRIES})`);
    }
    if (i < MAX_RETRIES) await new Promise((r) => setTimeout(r, RETRY_INTERVAL));
  }
  console.error(`❌ API 서버 연결 실패 (${healthUrl}) — ${MAX_RETRIES}회 시도 후 포기`);
}
