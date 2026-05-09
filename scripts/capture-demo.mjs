/**
 * 데모 WebM 영상 캡처
 * 사용: node scripts/capture-demo.mjs
 * 필요: 로컬 서버 + 클라이언트 실행 중
 */
import { chromium } from '../client/node_modules/playwright/index.mjs';
import { mkdir, rename } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../site/public/images');
const API = 'http://localhost:3000/api';
const CLIENT = 'http://localhost:3001';

const DEMO_CHAT = [
  { nickname: 'Alex', message: '이 노래 좋다 🔥' },
  { nickname: 'Mina', message: '다음 곡 뭐 넣을까?' },
  { nickname: 'Jay', message: 'NCS 플레이리스트 최고' },
  { nickname: 'Sora', message: 'Candyland 넣어줘!!' },
  { nickname: 'Haru', message: '방금 들어왔는데 뭐 듣고있어?' },
  { nickname: 'Mina', message: 'Sky High 듣는 중~' },
];

async function main() {
  await mkdir(resolve(OUT_DIR, 'features'), { recursive: true });

  // 1. 데모 셋업 (Fade 제외 — count=4)
  console.log('Setting up demo...');
  const roomRes = await fetch(`${API}/test/demo/room`);
  const { roomId } = await roomRes.json();
  if (!roomId) { console.error('Failed to create room'); process.exit(1); }

  await fetch(`${API}/test/demo/users?roomId=${roomId}`);
  await fetch(`${API}/test/demo/queue?roomId=${roomId}&count=4`);
  await fetch(`${API}/test/demo/play?roomId=${roomId}`);
  console.log('Room:', roomId);

  // 2. 토큰
  const tokenRes = await fetch(`${API}/test/token`);
  const { accessToken } = await tokenRes.json();

  // 3. 준비 (재생 + 가사 끄기)
  console.log('Preparing room state...');
  const prepBrowser = await chromium.launch({ headless: false, args: ['--autoplay-policy=no-user-gesture-required'] });
  const prepCtx = await prepBrowser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  await prepCtx.addCookies([{ name: 'sat', value: accessToken, domain: 'localhost', path: '/' }]);
  const prepPage = await prepCtx.newPage();
  await prepPage.goto(`${CLIENT}/rooms/${roomId}`);
  await prepPage.waitForTimeout(3000);

  // Next.js dev 위젯 숨기기
  await prepPage.evaluate(() => {
    document.querySelectorAll('[data-nextjs-dialog-overlay], [data-nextjs-toast], #__next-build-indicator, [class*="nextjs"]').forEach(el => el.remove());
    const devBtn = document.querySelector('button[aria-label="Open Next.js Dev Tools"]');
    if (devBtn) devBtn.remove();
  });

  // 듣기/재생 클릭
  const playBtn = prepPage.locator('button[aria-label="재생"]').first();
  if (await playBtn.isVisible().catch(() => false)) {
    await playBtn.click();
    await prepPage.waitForTimeout(3000);
  }

  // 가사 끄기
  const lyricsBtn = prepPage.locator('button[aria-label*="lyric" i], button[aria-label*="가사"]');
  if (await lyricsBtn.isVisible().catch(() => false)) {
    const lyricsPanel = prepPage.locator('[class*="lyrics" i], [data-testid="lyrics"]');
    if (await lyricsPanel.isVisible().catch(() => false)) {
      await lyricsBtn.click();
      await prepPage.waitForTimeout(500);
    }
  }
  await prepCtx.close();
  await prepBrowser.close();

  // 4. 녹화 시작
  console.log('Starting recording...');
  const browser = await chromium.launch({ headless: false, args: ['--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    recordVideo: {
      dir: OUT_DIR,
      size: { width: 1280, height: 720 },
    },
  });
  await context.addCookies([{ name: 'sat', value: accessToken, domain: 'localhost', path: '/' }]);
  const page = await context.newPage();
  await page.goto(`${CLIENT}/rooms/${roomId}`);
  await page.waitForTimeout(3000);

  // Next.js dev 위젯 숨기기
  await page.evaluate(() => {
    document.querySelectorAll('[data-nextjs-dialog-overlay], [data-nextjs-toast], #__next-build-indicator, [class*="nextjs"]').forEach(el => el.remove());
    const devBtn = document.querySelector('button[aria-label="Open Next.js Dev Tools"]');
    if (devBtn) devBtn.remove();
  });
  await page.waitForTimeout(1000);

  // 5. 채팅 2초 간격
  console.log('Injecting chat...');
  for (const msg of DEMO_CHAT) {
    await fetch(`${API}/test/demo/chat-one?roomId=${roomId}&nickname=${encodeURIComponent(msg.nickname)}&message=${encodeURIComponent(msg.message)}`);
    await page.waitForTimeout(2000);
  }

  await page.waitForTimeout(2000);

  // 6. 신청하기 → NCS 검색 → 곡 추가
  console.log('Opening search modal...');
  const addBtn = page.locator('button').filter({ hasText: /신청하기/ });
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click();
    await page.waitForTimeout(1500);

    // 검색 입력
    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('NCS Tobu');
      await page.waitForTimeout(3000);

      // 첫 번째 검색 결과 클릭
      const firstResult = page.locator('button').filter({ hasText: /Tobu/ }).first();
      if (await firstResult.isVisible().catch(() => false)) {
        await firstResult.click();
        await page.waitForTimeout(1500);
      }
    }
  }

  await page.waitForTimeout(3000);

  // 7. 스크린샷
  console.log('Capturing screenshot...');
  await page.screenshot({ path: resolve(OUT_DIR, 'room-demo.png') });

  // 8. 녹화 종료
  const videoPath = await page.video()?.path();
  await context.close();
  await browser.close();

  if (videoPath) {
    const dest = resolve(OUT_DIR, 'demo.webm');
    await rename(videoPath, dest);
    console.log('Video saved:', dest);
  }

  console.log('Done!');
}

main().catch(console.error);
