[🇺🇸 English](./deployment.md)

# 배포 가이드

## Docker Compose (권장)

### 사전 준비

- Docker 및 Docker Compose 설치
- (선택) 도메인 + 리버스 프록시 (nginx 등)

### 1. 프로젝트 클론

```bash
git clone https://github.com/Protomothis/ShareAux.git
cd ShareAux
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 아래 항목을 설정합니다.

#### 필수 항목

| 변수 | 설명 | 예시 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | `postgres://spotiparty:password@db:5432/spotiparty` |
| `JWT_SECRET` | JWT 서명 시크릿 (랜덤 문자열) | `openssl rand -hex 32` 로 생성 |
| `CLIENT_URL` | 클라이언트 접속 URL | `http://localhost:3001` |

#### 선택 항목

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | 미설정 시 Google 로그인 비활성 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 | |
| `GOOGLE_CALLBACK_URL` | OAuth 콜백 URL | `{CLIENT_URL}/api/auth/google/callback` |
| `GEMINI_API_KEY` | Gemini API 키 | 미설정 시 가사 번역 비활성 |
| `CAPTCHA_ENABLED` | PoW CAPTCHA 활성화 | `false` |
| `DB_PASSWORD` | PostgreSQL 비밀번호 | `spotiparty123` |

### 3. 실행

```bash
docker compose up -d
```

세 개의 컨테이너가 실행됩니다:

| 컨테이너 | 포트 | 설명 |
|----------|------|------|
| `shareaux-db` | 5432 | PostgreSQL |
| `shareaux-server` | 3000 | NestJS API + WebSocket |
| `shareaux-client` | 3001 | Next.js 프론트엔드 |

브라우저에서 `http://localhost:3001`로 접속합니다.

### 4. 초기 설정

첫 접속 시 `/setup` 페이지로 이동합니다. 관리자 계정을 생성하세요.

### 5. 개인정보처리방침 / 이용약관

ShareAux는 `/privacy` (개인정보처리방침)와 `/terms` (이용약관) 페이지를 기본 제공합니다. 셀프호스팅 시 운영 환경에 맞게 내용을 수정하세요.

- 파일 위치: `client/src/app/privacy/page.tsx`, `client/src/app/terms/page.tsx`
- 운영자 연락처, 데이터 보관 정책, 관할 법률 등을 실제 운영에 맞게 변경해야 합니다
- Google OAuth를 사용하는 경우, Google API 심사에서 개인정보처리방침 URL 제출이 필요할 수 있습니다. 배포된 인스턴스의 `/privacy` URL을 사용하세요

---

## GHCR 이미지 사용

소스를 빌드하지 않고 미리 빌드된 이미지를 사용할 수 있습니다.

```
ghcr.io/protomothis/shareaux-server:latest   # 최신 버전
ghcr.io/protomothis/shareaux-server:0.1.0    # 특정 버전
ghcr.io/protomothis/shareaux-client:latest
ghcr.io/protomothis/shareaux-client:0.1.0
```

안정적인 운영을 위해 `latest` 대신 특정 버전 태그 사용을 권장합니다.

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: spotiparty
      POSTGRES_USER: spotiparty
      POSTGRES_PASSWORD: ${DB_PASSWORD:-spotiparty123}
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U spotiparty']
      interval: 5s
      timeout: 5s
      retries: 5

  server:
    image: ghcr.io/protomothis/shareaux-server:latest
    environment:
      DATABASE_URL: postgres://spotiparty:${DB_PASSWORD:-spotiparty123}@db:5432/spotiparty
      CLIENT_URL: http://localhost:3001
    env_file: ./.env
    ports:
      - '3000:3000'
    depends_on:
      db:
        condition: service_healthy

  client:
    image: ghcr.io/protomothis/shareaux-client:latest
    environment:
      INTERNAL_API_URL: http://server:3000/api
    ports:
      - '3001:3001'
    depends_on:
      - server

volumes:
  pgdata:
```

```bash
docker compose up -d
```

---

## 리버스 프록시

ShareAux는 클라이언트(Next.js)와 서버(NestJS)가 별도 포트로 동작합니다. 리버스 프록시로 하나의 도메인에서 서비스하려면 아래 경로 규칙을 따르세요.

### 경로 구조

| 경로 | 대상 | 설명 |
|------|------|------|
| `/` | 클라이언트 (:3001) | Next.js 페이지 |
| `/api/*` | 서버 (:3000) | REST API |
| `/ws` | 서버 (:3000) | WebSocket (오디오 스트리밍 + 실시간 이벤트) |

> ⚠️ 클라이언트는 `window.location.origin`을 기준으로 API/WS URL을 자동 생성합니다.
> 따라서 `/api`와 `/ws`가 같은 도메인에서 접근 가능해야 합니다.

### 환경 변수 설정

리버스 프록시 사용 시 `.env`에서 아래 값을 실제 도메인으로 변경하세요:

```env
CLIENT_URL=https://aux.example.com
GOOGLE_CALLBACK_URL=https://aux.example.com/api/auth/google/callback
```

### nginx 예시

```nginx
server {
    listen 443 ssl;
    server_name aux.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # WebSocket (오디오 스트리밍) — 반드시 /ws를 별도로 처리
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 클라이언트 (Next.js) — 나머지 모든 경로
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Traefik 예시 (라벨 기반)

```yaml
services:
  server:
    labels:
      - "traefik.http.routers.shareaux-api.rule=Host(`aux.example.com`) && (PathPrefix(`/api`) || PathPrefix(`/ws`))"
      - "traefik.http.services.shareaux-api.loadbalancer.server.port=3000"
  client:
    labels:
      - "traefik.http.routers.shareaux-client.rule=Host(`aux.example.com`)"
      - "traefik.http.services.shareaux-client.loadbalancer.server.port=3001"
```

### 주의사항

- `/ws` 경로에 `proxy_read_timeout`을 충분히 길게 설정하세요 (오디오 스트리밍은 장시간 연결 유지)
- HTTPS 사용 시 WebSocket은 자동으로 `wss://`로 연결됩니다
- Cloudflare 등 CDN 사용 시 WebSocket 지원을 활성화해야 합니다

---

## 업데이트

```bash
# GHCR 이미지 사용 시
docker compose pull
docker compose up -d

# 소스 빌드 시
git pull
docker compose build
docker compose up -d
```

### DB 마이그레이션이 필요한 버전

일부 버전은 DB 스키마가 변경되어 마이그레이션이 필요합니다. `migrations/` 디렉토리에 SQL 스크립트가 제공됩니다.

```bash
# 1. 반드시 백업
docker compose exec db pg_dump -U spotiparty spotiparty > backup.sql

# 2. 마이그레이션 실행 (예: v0.1.2 → v0.1.3)
docker compose exec -T db psql -U spotiparty < migrations/v0.1.2-to-v0.1.3.sql

# 3. 이미지 업데이트
docker compose pull && docker compose up -d
```

> ⚠️ 마이그레이션 없이 업데이트하면 `synchronize: true`가 새 컬럼을 추가하지만, 기존 데이터가 유실될 수 있습니다.

---

## 문제 해결

### 서버 로그 확인

```bash
docker logs shareaux-server -f --tail 50
```

### DB 초기화

```bash
docker compose down -v   # 볼륨 포함 삭제
docker compose up -d     # 재생성
```

### 포트 충돌

기본 포트(3000, 3001, 5432)가 사용 중이면 `docker-compose.yml`에서 포트 매핑을 변경하세요.
