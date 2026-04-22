# 개발 가이드

## 필수 도구

| 도구 | 버전 | 용도 |
|------|------|------|
| Node.js | 22+ | 서버 + 클라이언트 런타임 |
| PostgreSQL | 16 | 데이터베이스 (Docker 권장) |
| ffmpeg | 6+ | 오디오 트랜스코딩 (fMP4 AAC) |
| media resolver | 최신 | 오디오 URL 추출 |
| python3 | 3.10+ | syncedlyrics (가사 검색) |

### macOS

```bash
brew install node ffmpeg python3
pip3 install yt-dlp
pip3 install syncedlyrics
```

### Ubuntu/Debian

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs ffmpeg python3 python3-pip
pip3 install syncedlyrics
```

---

## 프로젝트 구조

```
ShareAux/
├── server/          # NestJS 백엔드
│   ├── src/
│   │   ├── auth/        # 인증 (Google OAuth, JWT)
│   │   ├── rooms/       # 방 CRUD, WebSocket 게이트웨이
│   │   ├── player/      # 재생 제어, 스트리밍
│   │   ├── queue/       # 큐 관리
│   │   ├── search/      # 음악 검색
│   │   ├── admin/       # 관리자 API
│   │   ├── services/    # 공유 서비스 (오디오, 가사, 번역 등)
│   │   ├── entities/    # TypeORM 엔티티
│   │   └── types/       # 공유 타입
│   ├── dev.js           # 개발 서버 실행기
│   └── Dockerfile
├── client/          # Next.js 프론트엔드
│   ├── src/
│   │   ├── app/         # App Router 페이지
│   │   ├── components/  # UI 컴포넌트
│   │   ├── hooks/       # 커스텀 훅
│   │   ├── lib/         # 유틸리티
│   │   ├── api/         # orval 자동 생성 (수정 금지)
│   │   └── types/       # 공유 타입
│   ├── dev.js           # 개발 서버 실행기
│   └── Dockerfile
├── docker-compose.yml
├── .env                 # 환경 변수
└── dev.sh               # 개발 서버 일괄 실행
```

---

## 로컬 개발 환경 설정

### 1. 클론 및 의존성 설치

```bash
git clone https://github.com/Protomothis/ShareAux.git
cd ShareAux

cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. 환경 변수

```bash
cp .env.example .env
```

최소 설정:

```env
DATABASE_URL=postgres://spotiparty:spotiparty123@localhost:5432/spotiparty
JWT_SECRET=your-random-secret-here
CLIENT_URL=http://localhost:3001
```

### 3. 데이터베이스

```bash
docker compose up db -d
```

TypeORM `synchronize: true`로 테이블이 자동 생성됩니다.

### 4. 개발 서버 실행

```bash
# 방법 1: 일괄 실행
./dev.sh up        # DB + 서버 + 클라이언트
./dev.sh down      # 전부 종료

# 방법 2: 개별 실행 (screen 사용)
screen -dmS srv bash -c "cd server && node dev.js"
screen -dmS cli bash -c "cd client && node dev.js"
```

> **주의**: `nest start`나 `next dev`를 직접 실행하지 마세요. 반드시 `dev.js`를 통해 실행해야 포트 충돌 방지 및 종료 시 자식 프로세스 정리가 됩니다.

| 서비스 | 포트 | URL |
|--------|------|-----|
| 서버 | 3000 | http://localhost:3000/api |
| 클라이언트 | 3001 | http://localhost:3001 |
| Swagger | 3000 | http://localhost:3000/api/docs |

### 5. 초기 설정

브라우저에서 `http://localhost:3001`에 접속하면 `/setup` 페이지로 이동합니다. 관리자 계정을 생성하세요.

---

## 개발 워크플로우

### 코드 검증

파일 수정 후 반드시 아래 순서로 검증합니다:

```bash
# 서버
cd server
npx prettier --write src/path/to/file.ts
npx tsc --noEmit

# 클라이언트
cd client
npx prettier --write src/path/to/file.tsx
npx tsc --noEmit
```

### API 타입 생성

서버 DTO 변경 시 Swagger → orval로 클라이언트 타입을 재생성합니다:

```bash
# 1. 서버 실행 상태에서 swagger.json 다운로드
curl http://localhost:3000/api/docs-json > client/swagger.json

# 2. orval 실행
cd client && npm run api:generate
```

`client/src/api/` 디렉토리는 자동 생성되므로 직접 수정하지 마세요.

### 로그

개발 서버 로그는 프로젝트 루트의 `.log/` 디렉토리에 저장됩니다:

```
.log/server.log
.log/client.log
```

---

## 주요 컨벤션

### TypeScript

- strict 모드, `any` 사용 금지
- 서버: ESM (`"module": "nodenext"`) — 상대 import에 `.js` 확장자 필수
- 클라이언트: `@/*` → `./src/*` 경로 별칭
- 인라인 타입 금지 — `types/` 디렉토리에 named interface 정의

### 서버

- `ConfigService`로 환경 변수 접근 (`process.env` 직접 사용 금지)
- NestJS 예외 클래스 사용 (`NotFoundException`, `BadRequestException` 등)
- 엔티티 프로퍼티는 camelCase, DB 컬럼은 `@Column({ name: 'snake_case' })`

### 클라이언트

- 서버 컴포넌트 기본, `"use client"`는 필요할 때만
- `components/ui/` shadcn 프리미티브 사용 (인라인 HTML 요소 금지)
- zustand (클라이언트 상태) + react-query (서버 상태)
- `motion/react`에서 import (framer-motion 아님)
