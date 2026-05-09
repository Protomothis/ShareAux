#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m'

ROOT="$(cd "$(dirname "$0")" && pwd)"

# .env에서 설정 읽기
if [ -f "$ROOT/.env" ]; then
  set -a; source "$ROOT/.env"; set +a
fi
SERVER_PORT="${PORT:-3000}"
CLIENT_PORT="${CLIENT_PORT:-3001}"
STORYBOOK_PORT="${STORYBOOK_PORT:-6006}"
SSL_CLIENT_PORT="${SSL_CLIENT_PORT:-8443}"
SSL_SERVER_PORT="${SSL_SERVER_PORT:-8444}"
USE_HTTPS=false

# ─── OS 감지 ───

detect_os() {
  case "$(uname -s)" in
    Darwin*)  OS="mac" ;;
    Linux*)   OS="linux" ;;
    MINGW*|MSYS*|CYGWIN*) OS="windows" ;;
    *)        OS="unknown" ;;
  esac
}
detect_os

# ─── 유틸리티 ───

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${RED}✗ $1 not found${NC} — $2"
    return 1
  fi
  return 0
}

# 포트 사용 중인 PID 찾기 (크로스 플랫폼)
pids_on_port() {
  local port=$1
  if [ "$OS" = "mac" ] || [ "$OS" = "linux" ]; then
    lsof -ti:"$port" 2>/dev/null || true
  else
    # Windows (Git Bash / WSL)
    netstat -ano 2>/dev/null | grep ":$port " | awk '{print $5}' | sort -u || true
  fi
}

kill_port() {
  local port=$1
  local pids
  pids=$(pids_on_port "$port")
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
}

# 백그라운드 프로세스 관리 (screen 또는 nohup fallback)
HAS_SCREEN=false
if command -v screen &>/dev/null; then
  HAS_SCREEN=true
fi

bg_start() {
  local name=$1 cmd=$2 logfile=$3
  bg_stop "$name"
  sleep 0.5
  if $HAS_SCREEN; then
    screen -dmS "$name" bash -c "$cmd 2>&1 | tee '$logfile'"
  else
    nohup bash -c "$cmd" > "$logfile" 2>&1 &
    echo $! > "$ROOT/.log/${name}.pid"
  fi
}

bg_stop() {
  local name=$1
  if $HAS_SCREEN; then
    screen -S "$name" -X quit 2>/dev/null || true
  else
    local pidfile="$ROOT/.log/${name}.pid"
    if [ -f "$pidfile" ]; then
      kill -9 "$(cat "$pidfile")" 2>/dev/null || true
      rm -f "$pidfile"
    fi
  fi
}

# ─── 의존성 체크 ───

check_deps() {
  local fail=0

  echo -e "${CYAN}의존성 확인 중...${NC}"
  check_cmd node    "https://nodejs.org"                 || fail=1
  check_cmd npm     "Node.js와 함께 설치됩니다"           || fail=1
  check_cmd docker  "https://docs.docker.com/get-docker" || fail=1
  check_cmd curl    "brew install curl / apt install curl" || fail=1

  # node_modules 체크
  if [ ! -d "$ROOT/server/node_modules" ]; then
    echo -e "${RED}✗ server/node_modules 없음${NC} — cd server && npm install"
    fail=1
  fi
  if [ ! -d "$ROOT/client/node_modules" ]; then
    echo -e "${RED}✗ client/node_modules 없음${NC} — cd client && npm install"
    fail=1
  fi

  # .env 체크
  if [ ! -f "$ROOT/.env" ]; then
    echo -e "${YELLOW}⚠ .env 파일 없음${NC} — .env.example을 복사하세요"
    fail=1
  fi

  # Docker 데몬 체크
  ensure_docker || fail=1

  if [ $fail -eq 1 ]; then
    echo ""
    echo -e "${RED}필수 의존성이 누락되었습니다. 위 항목을 설치 후 다시 시도하세요.${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ 모든 의존성 확인 완료${NC}"
}

ensure_docker() {
  # docker context 자동 설정 (colima 등)
  if ! docker info &>/dev/null 2>&1; then
    # macOS: colima context 시도
    if [ "$OS" = "mac" ]; then
      if docker context use colima &>/dev/null 2>&1 && docker info &>/dev/null 2>&1; then
        echo -e "${GREEN}✓ Docker (colima context)${NC}"
        return 0
      fi
      # colima 시작 시도
      if command -v colima &>/dev/null; then
        echo -e "${YELLOW}⚠ Docker 데몬 시작 중 (colima)...${NC}"
        colima start 2>/dev/null
        if docker info &>/dev/null 2>&1; then
          echo -e "${GREEN}✓ Colima 시작됨${NC}"
          return 0
        fi
      fi
    fi
    echo -e "${RED}✗ Docker 데몬이 실행 중이 아닙니다${NC}"
    [ "$OS" = "mac" ] && echo -e "${DIM}  → colima start 또는 Docker Desktop 실행${NC}"
    [ "$OS" = "linux" ] && echo -e "${DIM}  → sudo systemctl start docker${NC}"
    [ "$OS" = "windows" ] && echo -e "${DIM}  → Docker Desktop 실행${NC}"
    return 1
  fi
  return 0
}

# ─── 명령어 ───

start_db() {
  echo -e "${GREEN}▶ DB 시작...${NC}"
  docker compose -f "$ROOT/docker-compose.yml" up db -d
  # healthy 대기
  local i=0
  while ! docker exec shareaux-db pg_isready -U spotiparty &>/dev/null && [ $i -lt 15 ]; do
    sleep 1; i=$((i + 1))
  done
  echo -e "${GREEN}✓ DB 준비 완료${NC}"
}

start_server() {
  echo -e "${GREEN}▶ 서버 시작...${NC}"
  mkdir -p "$ROOT/.log"
  bg_start srv "cd '$ROOT/server' && node dev.js" "$ROOT/.log/server.log"
  echo -e "${GREEN}✓ 서버 시작됨 (localhost:$SERVER_PORT)${NC}"
  if $HAS_SCREEN; then echo -e "${DIM}  → screen -r srv${NC}"; fi
}

start_client() {
  echo -e "${GREEN}▶ 클라이언트 시작...${NC}"
  mkdir -p "$ROOT/.log"
  bg_start cli "cd '$ROOT/client' && node dev.js" "$ROOT/.log/client.log"
  echo -e "${GREEN}✓ 클라이언트 시작됨 (localhost:$CLIENT_PORT)${NC}"
  if $HAS_SCREEN; then echo -e "${DIM}  → screen -r cli${NC}"; fi
}

start_storybook() {
  echo -e "${GREEN}▶ 스토리북 시작...${NC}"
  mkdir -p "$ROOT/.log"
  bg_start sb "cd '$ROOT/client' && npx storybook dev -p $STORYBOOK_PORT" "$ROOT/.log/storybook.log"
  echo -e "${GREEN}✓ 스토리북 시작됨 (localhost:$STORYBOOK_PORT)${NC}"
  if $HAS_SCREEN; then echo -e "${DIM}  → screen -r sb${NC}"; fi
}

stop_all() {
  echo -e "${RED}■ 종료 중...${NC}"

  bg_stop srv
  bg_stop cli
  bg_stop sb
  bg_stop sslproxy
  bg_stop caddy

  # 포트 정리
  local retries=0
  while [ $retries -lt 3 ]; do
    local remaining=false
    [ -n "$(pids_on_port $SERVER_PORT)" ] && remaining=true
    [ -n "$(pids_on_port $CLIENT_PORT)" ] && remaining=true
    if ! $remaining; then break; fi

    kill_port $SERVER_PORT
    kill_port $CLIENT_PORT
    kill_port $STORYBOOK_PORT
    kill_port $SSL_CLIENT_PORT
    kill_port $SSL_SERVER_PORT
    sleep 1
    retries=$((retries + 1))
  done

  echo -e "${GREEN}✓ 종료 완료${NC}"
}

wait_server() {
  echo -e "${DIM}서버 준비 대기 중...${NC}"
  local proto="http"
  if $USE_HTTPS; then proto="https"; fi
  local i=0
  while ! curl -sfk ${proto}://localhost:$SERVER_PORT/api/health &>/dev/null && [ $i -lt 45 ]; do
    sleep 1; i=$((i + 1))
  done
  if curl -sfk ${proto}://localhost:$SERVER_PORT/api/health &>/dev/null; then
    echo -e "${GREEN}✓ 서버 준비 완료${NC}"
  else
    echo -e "${RED}⚠ 서버 시작 실패${NC}"
    if $HAS_SCREEN; then echo -e "${DIM}  → screen -r srv 로 로그 확인${NC}"; fi
    echo -e "${DIM}  → cat .log/server.log${NC}"
    exit 1
  fi
}

show_status() {
  echo -e "${CYAN}=== ShareAux Status ===${NC}"
  printf "DB:        "
  if docker ps --format '{{.Status}}' -f name=shareaux-db 2>/dev/null | grep -q "Up"; then
    echo -e "${GREEN}running${NC}"
  else
    echo -e "${RED}stopped${NC}"
  fi
  printf "Server:    "
  if curl -sf http://localhost:$SERVER_PORT/api/health &>/dev/null; then
    echo -e "${GREEN}healthy (:$SERVER_PORT)${NC}"
  else
    echo -e "${RED}stopped${NC}"
  fi
  printf "Client:    "
  if curl -sf http://localhost:$CLIENT_PORT &>/dev/null; then
    echo -e "${GREEN}healthy (:$CLIENT_PORT)${NC}"
  else
    echo -e "${RED}stopped${NC}"
  fi
  printf "Storybook: "
  if curl -sf http://localhost:$STORYBOOK_PORT &>/dev/null; then
    echo -e "${GREEN}healthy (:$STORYBOOK_PORT)${NC}"
  else
    echo -e "${DIM}stopped${NC}"
  fi
}

regen_swagger() {
  echo -e "${CYAN}▶ swagger.json + orval 재생성...${NC}"
  curl -s http://localhost:$SERVER_PORT/api/docs-json | python3 -m json.tool > "$ROOT/client/swagger.json"
  cd "$ROOT/client" && npx orval
  echo -e "${GREEN}✓ 완료${NC}"
}

setup_cert() {
  if ! command -v mkcert &>/dev/null; then
    echo -e "${RED}✗ mkcert not found${NC}"
    [ "$OS" = "mac" ] && echo -e "${DIM}  → brew install mkcert${NC}"
    [ "$OS" = "linux" ] && echo -e "${DIM}  → https://github.com/FiloSottile/mkcert#installation${NC}"
    exit 1
  fi

  # 로컬 CA 설치 (이미 있으면 스킵, 최초 1회 sudo 필요)
  echo -e "${YELLOW}로컬 CA 설치 중 (최초 1회 sudo 필요)...${NC}"
  mkcert -install

  # LAN IP 자동 감지
  local lan_ip
  if [ "$OS" = "mac" ]; then
    lan_ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
  else
    lan_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  fi

  if [ -z "$lan_ip" ]; then
    echo -e "${RED}✗ LAN IP를 감지할 수 없습니다${NC}"
    exit 1
  fi

  mkdir -p "$ROOT/.certs"
  mkcert -cert-file "$ROOT/.certs/local.pem" -key-file "$ROOT/.certs/local-key.pem" \
    "$lan_ip" localhost 127.0.0.1 ::1

  echo ""
  echo -e "${GREEN}✓ 인증서 생성 완료${NC}"
  echo -e "  IP:   ${CYAN}$lan_ip${NC}"
  echo -e "  cert: .certs/local.pem"
  echo -e "  key:  .certs/local-key.pem"
  echo ""
  echo -e "${DIM}HTTPS로 시작하려면: HTTPS=true ./dev.sh up${NC}"
  echo -e "${DIM}접속: https://$lan_ip:$CLIENT_PORT${NC}"
}

clean_cert() {
  if [ -d "$ROOT/.certs" ]; then
    rm -rf "$ROOT/.certs"
    echo -e "${GREEN}✓ 인증서 삭제 완료${NC}"
  else
    echo -e "${DIM}삭제할 인증서가 없습니다${NC}"
  fi
}

show_help() {
  echo -e "${CYAN}ShareAux Dev CLI${NC}"
  echo ""
  echo "Usage: ./dev.sh <command>"
  echo ""
  echo "Commands:"
  echo "  up         DB + 서버 + 클라이언트 + 스토리북 전부 시작"
  echo "  up --https HTTPS 모드로 시작 (Cast/AirPlay 테스트용, cert 필요)"
  echo "  restart    down + up (전부 재시작)"
  echo "  down       전부 종료"
  echo "  db         DB만 시작"
  echo "  db:reset   DB 볼륨 삭제 후 재시작 (초기화)"
  echo "  server     서버만 시작"
  echo "  client     클라이언트만 시작"
  echo "  storybook  스토리북만 시작"
  echo "  cert       로컬 HTTPS 인증서 생성 (mkcert)"
  echo "  cert:clean 로컬 인증서 삭제"
  echo "  logs       서버/클라이언트 최근 로그"
  echo "  status     실행 상태 확인"
  echo "  swagger    swagger.json 재생성 + orval"
  echo "  check      의존성 체크"
  echo "  help       이 도움말 표시"
  echo ""
  echo -e "${DIM}포트: SERVER=$SERVER_PORT  CLIENT=$CLIENT_PORT  STORYBOOK=$STORYBOOK_PORT${NC}"
  echo -e "${DIM}설정: .env 파일에서 PORT, CLIENT_PORT, STORYBOOK_PORT 변경${NC}"
  if $HAS_SCREEN; then
    echo -e "${DIM}로그: screen -r srv / screen -r cli / screen -r sb${NC}"
  else
    echo -e "${DIM}로그: cat .log/server.log / .log/client.log / .log/storybook.log${NC}"
  fi
}

# ─── 라우팅 ───

case "${1:-}" in
  up)
    if [[ "${2:-}" == "--https" ]]; then
      USE_HTTPS=true
      if [ ! -f "$ROOT/.certs/local.pem" ]; then
        echo -e "${RED}✗ 인증서가 없습니다. 먼저 실행: ./dev.sh cert${NC}"
        exit 1
      fi
      if ! command -v npx &>/dev/null; then
        echo -e "${RED}✗ npx not found${NC}"
        exit 1
      fi
    fi
    check_deps
    stop_all
    start_db
    start_server
    wait_server
    start_client
    if $USE_HTTPS; then
      lan_ip=""
      if [ "$OS" = "mac" ]; then
        lan_ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
      else
        lan_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
      fi
      cat > "$ROOT/.certs/proxy.json" <<EOF
{
  "client": { "source": $SSL_CLIENT_PORT, "target": $CLIENT_PORT, "cert": "$ROOT/.certs/local.pem", "key": "$ROOT/.certs/local-key.pem", "hostname": "0.0.0.0" },
  "server": { "source": $SSL_SERVER_PORT, "target": $SERVER_PORT, "cert": "$ROOT/.certs/local.pem", "key": "$ROOT/.certs/local-key.pem", "hostname": "0.0.0.0" }
}
EOF
      bg_start sslproxy "npx --yes local-ssl-proxy --config '$ROOT/.certs/proxy.json'" "$ROOT/.log/sslproxy.log"
      echo -e "${GREEN}✓ HTTPS 프록시 시작됨 ($SSL_CLIENT_PORT→$CLIENT_PORT, $SSL_SERVER_PORT→$SERVER_PORT)${NC}"
    fi
    echo ""
    echo -e "${GREEN}🎉 전부 시작됨!${NC}"
    if $USE_HTTPS; then
      echo -e "  앱:       https://${lan_ip}:$SSL_CLIENT_PORT"
      echo -e "  서버(WS): https://${lan_ip}:$SSL_SERVER_PORT"
    else
      echo -e "  앱:       http://localhost:$CLIENT_PORT"
    fi
    ;;
  down)    stop_all ;;
  restart)
    stop_all
    sleep 1
    exec "$0" up ${2:-}
    ;;
  db)      check_deps; start_db ;;
  db:reset)
    echo -e "${YELLOW}⚠ DB 데이터가 모두 삭제됩니다.${NC}"
    read -p "계속하시겠습니까? (y/N) " confirm
    if [[ "$confirm" =~ ^[yY]$ ]]; then
      docker compose -f "$ROOT/docker-compose.yml" down -v
      echo -e "${GREEN}✓ DB 볼륨 삭제 완료${NC}"
      start_db
    else
      echo "취소됨"
    fi
    ;;
  server)    check_deps; start_server ;;
  client)    check_deps; start_client ;;
  storybook) check_deps; start_storybook ;;
  cert)      setup_cert ;;
  cert:clean) clean_cert ;;
  logs)
    echo -e "${CYAN}=== Server ===${NC}"
    tail -20 "$ROOT/.log/server.log" 2>/dev/null || echo "(no logs)"
    echo ""
    echo -e "${CYAN}=== Client ===${NC}"
    tail -20 "$ROOT/.log/client.log" 2>/dev/null || echo "(no logs)"
    echo ""
    echo -e "${CYAN}=== Storybook ===${NC}"
    tail -10 "$ROOT/.log/storybook.log" 2>/dev/null || echo "(no logs)"
    ;;
  status)  show_status ;;
  swagger) regen_swagger ;;
  check)   check_deps ;;
  help|-h|--help) show_help ;;
  *)       show_help ;;
esac
