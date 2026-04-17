const { config } = require('dotenv');
const { execSync, spawn } = require('child_process');
const { resolve } = require('path');

config({ path: resolve(__dirname, '../.env') });
const port = process.env.CLIENT_PORT || 3001;

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

const child = spawn('npx', ['next', 'dev', '--port', String(port)], {
  stdio: 'inherit',
  cwd: __dirname,
  shell: true,
});

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
