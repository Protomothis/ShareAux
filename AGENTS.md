# ShareAux — AI 에이전트 규칙

> 서버 작업 시 `server/AGENTS.md`, 클라이언트 작업 시 `client/AGENTS.md`도 함께 참조.

## 프로젝트 개요

셀프호스팅 실시간 음악 공유 플랫폼. 방을 만들고, YouTube 음악을 검색하고, 모든 참여자에게 WebSocket 바이너리로 실시간 스트리밍.

```
Client (Next.js 16) → NestJS API + raw WS → yt-dlp → ffmpeg (fMP4 AAC) → WS binary → Browser (MSE)
```

## 모노레포 구조

```
/
├── server/          NestJS 11 백엔드 (ESM, TypeORM, PostgreSQL 16, raw ws)
├── client/          Next.js 16 프론트엔드 (React 19, Tailwind 4, zustand, react-query)
├── docker-compose.yml   Caddy + PostgreSQL + server + client
└── .env             환경변수 (DB_PASSWORD, JWT_SECRET, CLIENT_URL 필수)
```

---

## 공통 규칙 (반드시 준수)

### TypeScript

- strict 모드. `any` 금지 → `unknown` 사용
- **`as` 캐스팅 금지** — 타입이 안 맞으면 근본 수정:
  - 서버→클라이언트: DTO/enum 서버에서 정의 → Swagger → orval 자동생성
  - DB↔코드: TypeORM transformer
  - jsonb: 엔티티에 정확한 타입
  - 외부 API: 전용 interface + 제네릭 파싱
  - 허용 예외: 외부 라이브러리 내부 접근(passport), `as const`, `as Error`
- 인라인 객체 타입 금지 → `types/`에 named interface
- `type` import: `import type { Foo } from './foo.js';`
- 조기 리턴 선호 (중첩 조건문 지양)

### 코드 스타일

- 한국어 주석 허용, 식별자는 영어
- 환경 변수 하드코딩 금지
- UI 라벨/메타데이터 하드코딩 금지 → 서버 API 기반
- Prettier: singleQuote, trailingComma: all, printWidth: 120, endOfLine: lf

### 코드 검증 (파일 수정 후 필수)

```bash
npx prettier --write <파일>
npx tsc --noEmit
```

---

## Git 워크플로

### 브랜치

- `main` — 안정 릴리스 (직접 커밋 금지)
- `develop` — 개발 통합
- `feat/<이름>`, `fix/<이름>`, `chore/<이름>` — develop에서 분기
- 릴리스: `feat/v{version}` → develop → main 머지 + 태그

### 커밋

- 한국어 Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `style:`
- 커밋/푸시/배포는 사용자 명시 요청 시에만

### 이슈 & 마일스톤

- **이슈 우선 원칙**: 코드 수정 전 GitHub 이슈 먼저 작성
- 버전별 `v{major}.{minor}.{patch}` 마일스톤
- CHANGELOG: 유저 친화적, 기술 용어 금지, 이슈 번호 참조

---

## 아키텍처 개요

### 서버 모듈 (12개)

| 모듈 | 역할 |
|------|------|
| auth | Google OAuth + 로컬 + 게스트, JWT 발급/갱신 |
| rooms | 방 CRUD + WebSocket 게이트웨이 (Gateway → MessageRouter → Broadcaster) |
| player | 재생 제어, 투표 스킵, 상태 관리 |
| queue | 큐 추가/삭제/재정렬, 개인 한도 |
| search | YouTube innertube 직접 파싱 |
| services | Audio, Ytdlp, Preload, AutoDJ, AI DJ(Gemini), Lyrics, Settings, Translation, ChatMute, IpBan, Metrics |
| admin | 대시보드, 유저/방/설정/메트릭/정리/신고 |
| favorites | 즐겨찾기 + 폴더 |
| tracks | 트랙 정보/투표 |
| push | Web Push (VAPID) |
| captcha | PoW CAPTCHA |
| test | 개발 전용 |

### WebSocket 바이너리 프로토콜

첫 바이트 = opcode, 나머지 = payload:

| OpCode | 값 | 방향 | 설명 |
|--------|-----|------|------|
| Audio | 0x01 | S→C | fMP4 AAC 청크 |
| Chat | 0x02 | 양방향 | JSON 채팅 |
| System | 0x03 | S→C | JSON 이벤트 (WsEvent enum) |
| Heartbeat | 0x04 | C→S | 60초 간격 |
| Resync | 0x05 | C→S | init segment 재요청 |
| ListenerStatus | 0x06 | C→S | 1바이트 (0=off, 1=on) |
| Reaction | 0x07 | 양방향 | 이모지 인덱스 |
| PingMeasure | 0x08 | 양방향 | Float64 RTT |
| ResyncWait | 0x09 | S→C | init 미준비, 2초 후 재시도 |

### 오디오 파이프라인

```
PreloadService (50MB 메모리 풀, 방당 3곡)
    ↓ Buffer 또는 URL
AudioService.startStream()
    ↓ ffmpeg -i pipe:0 (또는 URL)
    ├─ stdout: fMP4 AAC (1초 fragment) → WS binary (0x01) → synced 리스너
    └─ fd 3: ADTS AAC → HTTP 스트림 (Cast/AirPlay)
```

- init segment: ftyp+moov 파싱 후 분리, resyncListener에서만 전송
- 곡 전환: TRACK_END_DELAY_MS(3초) 대기 후 다음 곡. 스킵 시 즉시
- 실패 시 최대 3회 재시도 (새 URL 획득)

### 인증 흐름

| 방식 | 토큰 | 특징 |
|------|------|------|
| 로컬 (username+password) | Access(15분) + Refresh(7일) | 첫 유저 = SuperAdmin |
| Google OAuth | Access + Refresh | SettingsService에서 credentials 로드 |
| 게스트 (초대코드+닉네임) | Access(12시간)만 | Permission.Listen만 기본 |

- JWT payload: `{ sub, email, nickname, role }`
- 쿠키: `sat`(access), `sart`(refresh)
- Token Rotation: refresh 사용 시 즉시 revoke + 새 쌍 발급

### 설정 시스템

- `OptionKey` enum (27개) → `OPTION_METAS` (타입/기본값/min/max/secret)
- 시크릿: AES-256-GCM 암호화 저장, 캐시에는 평문
- `.env` → DB 시딩 (첫 실행), 이후 DB 값 우선
- 변경 시 핫 리로드: GoogleStrategy, TranslationService
- 새 설정 추가: `OptionKey` + `OPTION_METAS` + `SharedEnums` 등록 → orval 재생성

---

## 로컬 개발

```bash
./dev.sh up          # DB + 서버 + 클라이언트 일괄 실행
./dev.sh down        # 전부 종료
./dev.sh up --https  # HTTPS 모드 (Cast/AirPlay 테스트)
./dev.sh swagger     # swagger.json 재생성 + orval
./dev.sh db:reset    # DB 볼륨 삭제 후 재시작
```

> `nest start`, `next dev` 직접 실행 금지 — `dev.js`를 거치지 않으면 포트 충돌

### orval 재생성 (서버 DTO 변경 시)

```bash
# 서버 재시작 후
cd client && rm src/api/model/index.ts && npx orval
```

---

## 인프라

- **Gateway**: Caddy — `/api/*` → server:3000, `/ws` → server:3000, 나머지 → client:3001
- **DB**: PostgreSQL 16, 볼륨 `pgdata`
- **Docker**: server(node:22 + ffmpeg + yt-dlp), client(Next.js standalone)
- **CI**: GitHub Actions — Docker 빌드 → GHCR push (수동 트리거)
- **Pre-commit**: Husky — 양쪽 `tsc --noEmit`
