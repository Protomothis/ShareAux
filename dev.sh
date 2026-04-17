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

# ─── 의존성 체크 ───

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${RED}✗ $1 not found${NC} — $2"
    return 1
  fi
  return 0
}

check_deps() {
  local fail=0

  echo -e "${CYAN}의존성 확인 중...${NC}"
  check_cmd node      "https://nodejs.org"                || fail=1
  check_cmd npm       "Node.js와 함께 설치됩니다"          || fail=1
  check_cmd docker    "https://docs.docker.com/get-docker" || fail=1
  check_cmd screen    "brew install screen / apt install screen" || fail=1
  check_cmd curl      "brew install curl / apt install curl"     || fail=1
  check_cmd python3   "swagger.json 포맷팅에 필요"          || fail=1

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

  # docker daemon 체크 (colima 자동 시작)
  if ! docker info &>/dev/null; then
    if command -v colima &>/dev/null; then
      echo -e "${YELLOW}⚠ colima start 실행 중...${NC}"
      colima start
      if docker info &>/dev/null; then
        echo -e "${GREEN}✓ Colima 시작됨${NC}"
      else
        echo -e "${RED}✗ Colima 시작 실패${NC}"
        fail=1
      fi
    else
      echo -e "${RED}✗ Docker 데몬이 실행 중이 아닙니다${NC} — colima start"
      fail=1
    fi
  fi

  if [ $fail -eq 1 ]; then
    echo ""
    echo -e "${RED}필수 의존성이 누락되었습니다. 위 항목을 설치 후 다시 시도하세요.${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ 모든 의존성 확인 완료${NC}"
}

# ─── 명령어 ───

start_db() {
  echo -e "${GREEN}▶ DB 시작...${NC}"
  docker compose -f "$ROOT/docker-compose.yml" up db -d
  echo -e "${GREEN}✓ DB 준비 완료${NC}"
}

start_server() {
  echo -e "${GREEN}▶ 서버 시작...${NC}"
  screen -S srv -X quit 2>/dev/null 1>/dev/null || true
  sleep 1
  screen -dmS srv bash -c "cd '$ROOT/server' && node dev.js 2>&1 | tee '$ROOT/.log/server.log'"
  echo -e "${GREEN}✓ 서버 시작됨 (screen -r srv / localhost:$SERVER_PORT)${NC}"
}

start_client() {
  echo -e "${GREEN}▶ 클라이언트 시작...${NC}"
  screen -S cli -X quit 2>/dev/null 1>/dev/null || true
  sleep 1
  screen -dmS cli bash -c "cd '$ROOT/client' && node dev.js 2>&1 | tee '$ROOT/.log/client.log'"
  echo -e "${GREEN}✓ 클라이언트 시작됨 (screen -r cli / localhost:$CLIENT_PORT)${NC}"
}

stop_all() {
  echo -e "${RED}■ 종료 중...${NC}"

  # 1. screen 세션 종료
  screen -S srv -X quit 2>/dev/null 1>/dev/null || true
  screen -S cli -X quit 2>/dev/null 1>/dev/null || true

  # 2. 포트 점유 프로세스 강제 종료 (자식 node 포함)
  local retries=0
  while lsof -ti:$SERVER_PORT -ti:$CLIENT_PORT &>/dev/null && [ $retries -lt 5 ]; do
    lsof -ti:$SERVER_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$CLIENT_PORT | xargs kill -9 2>/dev/null || true
    sleep 1
    retries=$((retries + 1))
  done

  # 3. 확인
  if lsof -ti:$SERVER_PORT &>/dev/null || lsof -ti:$CLIENT_PORT &>/dev/null; then
    echo -e "${RED}⚠ 일부 프로세스가 남아있을 수 있습니다${NC}"
  else
    echo -e "${RED}✓ 서버/클라이언트 종료${NC}"
  fi
}

show_status() {
  echo -e "${CYAN}=== ShareAux Status ===${NC}"
  printf "DB:      "; docker ps --format '{{.Status}}' -f name=shareaux-db 2>/dev/null || echo "stopped"
  printf "Server:  "; curl -s -o /dev/null -w "%{http_code}" http://localhost:$SERVER_PORT/api/health 2>/dev/null && echo " (healthy)" || echo "stopped"
  printf "Client:  "; curl -s -o /dev/null -w "%{http_code}" http://localhost:$CLIENT_PORT 2>/dev/null && echo " (healthy)" || echo "stopped"
  echo ""
  echo -e "${DIM}Server: :$SERVER_PORT  Client: :$CLIENT_PORT${NC}"
}

regen_swagger() {
  echo -e "${CYAN}▶ swagger.json + orval 재생성...${NC}"
  curl -s http://localhost:$SERVER_PORT/api/docs-json | python3 -m json.tool > "$ROOT/client/swagger.json"
  cd "$ROOT/client" && npx orval
  echo -e "${GREEN}✓ 완료${NC}"
}

show_help() {
  echo -e "${CYAN}ShareAux Dev CLI${NC}"
  echo ""
  echo "Usage: ./dev.sh <command>"
  echo ""
  echo "Commands:"
  echo "  up        DB + 서버 + 클라이언트 전부 시작"
  echo "  restart   down + up (전부 재시작)"
  echo "  down      전부 종료"
  echo "  db        DB만 시작"
  echo "  db:reset  DB 볼륨 삭제 후 재시작 (초기화)"
  echo "  server    서버만 시작"
  echo "  client    클라이언트만 시작"
  echo "  logs      서버/클라이언트 최근 로그"
  echo "  status    실행 상태 확인"
  echo "  swagger   swagger.json 재생성 + orval"
  echo "  check     의존성 체크"
  echo "  help      이 도움말 표시"
  echo ""
  echo -e "${DIM}포트 설정은 .env 파일에서 변경 (PORT, CLIENT_PORT)${NC}"
  echo -e "${DIM}로그 직접 보기: screen -r srv / screen -r cli${NC}"
}

# ─── 라우팅 ───

case "${1:-}" in
  up)
    check_deps
    stop_all
    start_db
    sleep 3
    start_server
    # 서버 health check 대기
    echo -e "${DIM}서버 준비 대기 중...${NC}"
    i=0
    while ! curl -sf http://localhost:$SERVER_PORT/api/health &>/dev/null && [ $i -lt 30 ]; do
      sleep 1; i=$((i + 1))
    done
    if curl -sf http://localhost:$SERVER_PORT/api/health &>/dev/null; then
      echo -e "${GREEN}✓ 서버 준비 완료${NC}"
    else
      echo -e "${RED}⚠ 서버 시작 실패 — screen -r srv 로 로그 확인${NC}"
      exit 1
    fi
    start_client
    echo ""
    echo -e "${GREEN}🎉 전부 시작됨! http://localhost:$CLIENT_PORT${NC}"
    ;;
  down)    stop_all ;;
  restart)
    stop_all
    sleep 1
    exec "$0" up
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
  server)  check_deps; start_server ;;
  client)  check_deps; start_client ;;
  logs)
    echo -e "${CYAN}=== Server ===${NC}"
    tail -20 "$ROOT/.log/server.log" 2>/dev/null || echo "(no logs)"
    echo ""
    echo -e "${CYAN}=== Client ===${NC}"
    tail -20 "$ROOT/.log/client.log" 2>/dev/null || echo "(no logs)"
    ;;
  status)  show_status ;;
  swagger) regen_swagger ;;
  check)   check_deps ;;
  help|-h|--help) show_help ;;
  *)       show_help ;;
esac
