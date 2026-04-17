# ShareAux — AI 에이전트 규칙

> AI 코딩 어시스턴트(Copilot, Cursor, Kiro 등)를 사용하여 이 프로젝트에 기여할 때 참고하세요.
> 이 파일은 AI가 프로젝트 컨텍스트를 이해하고 일관된 코드를 생성하도록 돕습니다.

## 프로젝트 개요

셀프호스팅 실시간 음악 공유 플랫폼. 방을 만들고, 음악을 검색하고, 모든 참여자에게 WebSocket 바이너리로 실시간 스트리밍합니다.

```
클라이언트 (Next.js 16) → NestJS API + raw WebSocket → yt-dlp → ffmpeg (fMP4 AAC) → WS 바이너리 → 브라우저 (MSE)
```

## 모노레포 구조

- `server/` — NestJS 11 백엔드
- `client/` — Next.js 16 프론트엔드
- `docker-compose.yml` — 로컬 개발 (PostgreSQL + 서버 + 클라이언트)

---

## 공통 규칙

- TypeScript strict 모드. `any` 사용 금지 — `unknown` 사용
- 조기 리턴 선호 (중첩 조건문 지양)
- 한국어 주석 허용, 코드 식별자는 영어
- 환경 변수 하드코딩 금지
- 인라인 객체 타입 금지 — `types/` 디렉토리에 named interface 정의
- `type` import 사용: `import type { Foo } from './foo.js';`

### 코드 검증

파일 수정 후 반드시 아래 순서로 실행:

```bash
npx prettier --write <파일>
npx tsc --noEmit
```

### 브랜치 전략

- `main` — 안정 릴리스. 직접 커밋 금지
- `develop` — 개발 통합 브랜치. feature/fix 브랜치를 여기에 머지
- `feat/<이름>` — 새 기능 개발
- `fix/<이름>` — 버그 수정
- `chore/<이름>` — 설정, 문서, 리팩토링 등
- 릴리스 시 `develop` → `main` 머지 + 태그

### 커밋 메시지

한국어로 작성. [Conventional Commits](https://www.conventionalcommits.org/) 형식:

```
<타입>: <설명>

[본문 (선택)]
```

| 타입 | 용도 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 리팩토링 (기능 변경 없음) |
| `docs` | 문서 |
| `chore` | 빌드, 설정, 의존성 |
| `style` | 코드 스타일 (포매팅 등) |

예시:
```
feat: 투표 스킵 기능 추가
fix: 곡 전환 시 init segment 누락 수정
refactor: Modal compound component 패턴으로 전환
```

### 커밋/푸시/배포

사용자가 명시적으로 요청할 때만 수행. 자동으로 하지 않음.

---

## 서버 (NestJS 11)

### 기술 스택

NestJS 11 · TypeORM · PostgreSQL 16 · raw `ws` WebSocket · Passport (Google OAuth + JWT) · yt-dlp · ffmpeg

### ESM 필수

- `tsconfig.json`: `"module": "nodenext"`
- **모든 상대 import에 `.js` 확장자 필수**: `import { Foo } from './foo.js';`
- `.js` 누락 시 런타임 에러 발생

### 모듈 구조

```
src/
├── auth/          # Google OAuth, JWT, 가드
├── rooms/         # 방 CRUD, WebSocket 게이트웨이, 멤버 관리
├── player/        # 재생 제어, 스트리밍 조율
├── queue/         # 큐 관리 (추가, 삭제, 순서 변경, 투표 스킵)
├── search/        # 음악 검색 (innertube API)
├── admin/         # 관리자 API
├── services/      # 공유 서비스 (오디오, 가사, 번역, 프리로드 등)
├── entities/      # TypeORM 엔티티
├── guards/        # JwtAuthGuard, RoomPermissionGuard
├── types/         # 공유 타입
└── constants.ts   # 상수
```

### 규칙

- 환경 변수: `ConfigService` 사용 (`process.env` 직접 접근 금지)
- 엔티티 프로퍼티: camelCase, DB 컬럼: `@Column({ name: 'snake_case' })`
- API 응답: camelCase (DTO/엔티티가 camelCase로 직렬화)
- DTO: `class-validator` 데코레이터 사용, `dto/` 하위 디렉토리
- 전역: `ValidationPipe({ whitelist: true, transform: true })`
- WebSocket: raw `ws` 라이브러리 (`socket.io` 아님)
- 기능별 1모듈 (module + service + controller 같은 디렉토리)

### 오디오 파이프라인

- yt-dlp → ffmpeg (fMP4 AAC) → WS 바이너리 → 브라우저 MSE
- `audio` + `MediaSource` + `SourceBuffer`는 `useAudio.init()`에서 1회 생성, 재생성 금지
- 곡 전환: `clearBuffer()` — `sb.abort()` + `sb.remove()`. 새 MediaSource 생성 금지
- `audio.load()` 호출 금지 (재생 상태 리셋, iOS 제스처 토큰 소비)
- `audio.play()`는 유저 제스처 컨텍스트에서 동기적으로 호출 (await 전에)

---

## 클라이언트 (Next.js 16)

### 기술 스택

Next.js 16 · React 19 · Tailwind 4 · zustand · @tanstack/react-query · shadcn/ui · dnd-kit · motion

### 프로젝트 구조

```
src/
├── app/            # App Router 페이지
├── components/
│   ├── ui/         # shadcn 프리미티브 (Button, Input, Dialog 등)
│   ├── common/     # 공통 컴포넌트 (Modal, ErrorBoundary 등)
│   ├── player/     # 플레이어 관련
│   ├── queue/      # 큐 관련
│   ├── chat/       # 채팅
│   ├── room/       # 방 관련
│   └── admin/      # 관리자
├── hooks/          # 커스텀 훅
├── lib/            # 유틸리티 (api-client, utils, constants)
├── api/            # orval 자동 생성 (수정 금지)
├── types/          # 공유 타입
└── stores/         # zustand 스토어
```

### 규칙

- 서버 컴포넌트 기본. `"use client"`는 훅/브라우저 API/인터랙션 필요 시에만
- `components/ui/` shadcn 프리미티브 필수 사용 (인라인 `<button>`, `<input>` 금지)
- HTTP: `ky` (`@/lib/api-client.ts`), fetch/axios 사용 금지
- 상태: zustand (클라이언트), react-query (서버)
- 스타일: Tailwind 4 + `cn()` (`@/lib/utils.ts`)
- 애니메이션: `motion/react`에서 import (`framer-motion` 아님)
- 경로 별칭: `@/*` → `./src/*`
- `client/src/api/`는 orval 자동 생성 — 수동 수정 금지

### React 19 컴파일러 규칙

- ref 변수: `Ref` 접미사 필수 (`goneRef`, `wsRef`, `timerRef`)
- 렌더 중 `ref.current` 읽기/쓰기 금지 — `useEffect`, `useCallback`, 이벤트 핸들러에서만
- `useEffect` 내 동기적 `setState` 금지 — 파생 상태 또는 콜백 패턴 사용
- props/훅 반환값 불변 — 절대 mutate 금지

### 모바일 호환

- 레이아웃: `fixed inset-0` (`100vh`/`100dvh` 금지 — iOS Safari 주소창 이슈)
- 퇴장 감지: `pagehide` + `sendBeacon` (`beforeunload`는 모바일 Safari에서 불안정)
- 스크롤 방지: `overscroll-behavior: none`
- 터치: `touch-manipulation` (300ms 딜레이 제거)
- fixed 요소: 부모에 `transition-*` 금지 (iOS에서 containing block 생성)

### URL / 리버스 프록시

- 클라이언트 API 호출: `window.location.origin` 기반
- 서버 컴포넌트: `getServerApiUrl()` (`INTERNAL_API_URL` 런타임 환경 변수)
- WebSocket: `getWsUrl()` — dev(포트 3001→3000) vs prod(같은 호스트) 자동 감지
- 빌드 타임 URL 환경 변수 금지 — 모든 URL은 `lib/urls.ts`에서 런타임 해석

---

## 로컬 개발

```bash
# DB
docker compose up db -d

# 서버 + 클라이언트 (dev.js 경유 필수)
./dev.sh up        # 일괄 실행
./dev.sh down      # 전부 종료
```

> `nest start`, `next dev`, `npm run start:dev` 직접 실행 금지 — `dev.js`를 거치지 않으면 포트 충돌 발생
