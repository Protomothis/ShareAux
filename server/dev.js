const { config } = require('dotenv');
const { execSync, spawn } = require('child_process');
const { resolve } = require('path');

config({ path: resolve(__dirname, '../.env') });
const port = process.env.SERVER_PORT || 3000;
process.env.PORT = port;

// 포트 충돌 방지 — 기존 프로세스 kill
function killPort() {
  try {
    if (process.platform === 'win32') {
      execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port} ^| findstr LISTENING') do taskkill /F /PID %a`, { stdio: 'ignore', shell: 'cmd.exe' });
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
    }
  } catch {}
}

killPort();

// ffmpeg 체크
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
} catch {
  console.error('\x1b[31m✗ ffmpeg not found\x1b[0m — scoop install ffmpeg / brew install ffmpeg');
  process.exit(1);
}

// Python 의존성 (yt-dlp, syncedlyrics)
try {
  execSync('pip install -q -r requirements.txt', { cwd: __dirname, stdio: 'inherit' });
} catch {
  console.warn('\x1b[33m⚠ pip install failed — yt-dlp / syncedlyrics may not work\x1b[0m');
}

// nest start --watch를 spawn으로 실행 — 종료 시 자식 프로세스 정리
const child = spawn('npx', ['nest', 'start', '--watch'], {
  stdio: 'inherit',
  cwd: __dirname,
  shell: true,
});

// dev.js 종료 시 자식 트리 전체 kill + 포트 정리
function cleanup() {
  child.kill('SIGTERM');
  killPort();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => {
  child.kill('SIGTERM');
  killPort();
});
