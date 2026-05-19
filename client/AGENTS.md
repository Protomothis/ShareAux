# ShareAux Client — AI 에이전트 레퍼런스

> 루트 `AGENTS.md`의 공통 규칙을 먼저 숙지할 것.

## 기술 스택

Next.js 16 · React 19 · Tailwind 4 · zustand · @tanstack/react-query · shadcn/ui (base-ui) · dnd-kit · motion · next-intl · orval · ky

---

## 필수 규칙

### 컴포넌트

- 서버 컴포넌트 기본. `"use client"`는 훅/브라우저 API 필요 시에만
- `components/ui/` — shadcn 프리미티브 (수정 금지)
- `components/common/` — 프로젝트 공통 래퍼
- `components/<domain>/` — 기능별 (player, queue, chat, room, admin)
- 인라인 `<button>`, `<input>` 금지 → shadcn 프리미티브 사용

### 상태 관리

- **zustand** — 클라이언트 전용 상태 (auth, preferences)
- **react-query** — 서버 상태 전부 (orval 자동생성 훅)
- 동일 로직 여러 컴포넌트 → 훅으로 추출

### 스타일

- Tailwind 4 유틸리티 + `cn()` (`@/lib/utils.ts` — clsx + tailwind-merge)
- 애니메이션: `motion/react`에서 import (`framer-motion` 아님)

### API 연동

- `src/api/`는 orval 자동생성 — **수동 수정 금지**
- orval 생성 함수만 사용 — `customFetch` 직접 호출 금지
- 서버 타입만 사용 — 클라이언트에서 API 응답 타입 직접 정의 금지
- enum은 서버에서 정의 — 클라이언트 전용 enum 금지
- 재생성: `cd client && rm src/api/model/index.ts && npx orval`

### React 19 컴파일러 규칙

- ref 변수: `Ref` 접미사 필수 (`goneRef`, `wsRef`)
- 렌더 중 `ref.current` 읽기/쓰기 금지 — useEffect/useCallback/이벤트 핸들러에서만
- props/훅 반환값 불변 — mutate 금지

---

## 디렉토리 구조

```
src/
├── api/              orval 자동생성 (수정 금지)
│   ├── model/        DTO/enum 타입 (236개)
│   └── mutator.ts    customFetch (401 자동 refresh)
├── app/              App Router 페이지
├── components/
│   ├── ui/           shadcn 프리미티브 (27개, 수정 금지)
│   ├── common/       프로젝트 공통 래퍼 (28개)
│   ├── player/       플레이어 (10개)
│   ├── queue/        큐/검색 (25개)
│   ├── chat/         채팅 (5개)
│   ├── room/         방 관리 (17개)
│   └── admin/        어드민 (16개+)
├── hooks/            커스텀 훅 (24개 + admin/ 13개)
├── stores/           zustand (auth, preferences)
├── lib/              유틸리티 (19개)
├── types/            클라이언트 전용 타입 (11개)
├── i18n/             next-intl 설정
├── stories/          Storybook 스토리
└── middleware.ts     인증/locale/admin 가드
```

---

## 페이지 라우팅

```
/              → redirect('/login')
/login         → 로그인 (Google, 로컬, 게스트)
/auth/callback → OAuth 콜백
/setup         → 초기 설정 (첫 실행)
/rooms         → 방 목록
/rooms/[id]    → 방 상세 (RoomClient — 메인 SPA)
/admin/*       → 어드민 (대시보드, users, rooms, settings, invite-codes, ip-bans, audit-logs, errors, cleanup, tracks, reports)
/terms         → 이용약관 (MDX)
/privacy       → 개인정보처리방침 (MDX)
```

미들웨어: `sat` JWT 쿠키 없으면 `/login` 리다이렉트. `/admin`은 role 체크.

---

## 훅 계층 (방 실시간 기능)

```
useWebSocket          순수 WS 연결 (연결/재연결/heartbeat)
    ↓ raw ArrayBuffer
useWsMessages         opcode별 디스패치 (Audio/Chat/System/Reaction/PingMeasure)
    ↓ 파싱된 데이터
useRoomSync           resync 로직 (listening 상태 + resync 타이머/재시도)
useRoomEvents         System 이벤트 → playback/roomState/chat 위임
usePlaybackState      재생 상태 (track, streamState, timeSync, lyrics)
useRoomState          방 부가 상태 (skipVotes, listenerCount, autoDjStatus)
useRoomAudio          오디오 재생 관리 (useAudio 래퍼)
    ↓
useAudio              MSE fMP4 AAC 스트리밍 (SourceBuffer, 적응형 버퍼링)
```

### 기능 훅

| 훅 | 역할 |
|---|---|
| useAutoDj | AI DJ 제어 (모드/태그/후보/pin/skip/enqueue) |
| useFavorites | 즐겨찾기 토글/ID 목록 |
| useSearch | YouTube 검색 + 자동완성 + 플레이리스트 |
| useQueueDnd | 큐 드래그앤드롭 (dnd-kit) |
| useQueries | react-query 키 관리 + invalidation |
| useMyPermissions | 현재 유저 권한 |
| useReactions | 플로팅 리액션 애니메이션 |
| usePushSubscription | 웹 푸시 구독 |
| useAudioControl | 볼륨/뮤트 |

---

## MSE 오디오 재생 (useAudio)

### 핵심 설계

- `Audio` + `MediaSource` + `SourceBuffer`는 `init()`에서 **1회만 생성**
- 곡 전환: `clearBuffer()` — `sb.abort()` + `sb.remove()`. 새 MediaSource 생성 금지
- `audio.load()` 호출 금지 (iOS 제스처 토큰 소비)
- `audio.play()`는 `updateend`에서 버퍼 확보(`tryPlay`) 후 호출

### 적응형 버퍼링

| 상태 | 임계값 | 설명 |
|------|--------|------|
| startup | 2.0초 | 첫 재생 시작 전 |
| rebuffer | 1.0~2.5초 | stall 감지 후 (횟수에 따라 에스컬레이션) |
| steady | 0.4초 | 정상 재생 중 |
| timeout | 5초 | 미도달 시 현재 버퍼로 강제 재생 |

### stall 감지

- `waiting` 이벤트 → `pause()` → rebuffer → 임계값 확보 후 resume
- `play()` 직후 500ms 이내 `waiting`은 디코더 초기화 — stall 아님 (`playStartedAtRef`)

### currentTime 규칙

- 첫 play 전: seek 1회 (버퍼 시작점)
- 재생 중: drift > 5초일 때만 보정
- 매 updateend마다 무조건 갱신 금지 — 재생 위치 밀림 버그

### resync 규칙

- `sendResync`는 `streaming` 전환 시에만 — `preparing`에서는 `prepareResync`(버퍼 정리)만
- 중간 입장(이미 streaming)은 `handleListenToggle`에서 `sendResync`
- 가드: `gotInitRef` + `resettingRef` 두 개만

### Safari 호환

- `ManagedMediaSource` (iOS) 자동 감지 → `srcObject = ms.handle`

---

## WebSocket 클라이언트

### 연결 관리 (useWebSocket)

- 지수 백오프 재연결: 1s → 2s → 4s → ... → 30s (최대 10회)
- visibilitychange 시 즉시 재연결 시도
- 의도적 종료 (4003 Kicked, 4004 RoomGone, 4007 Duplicate, 4008 JoinedOther) → 재연결 안 함
- 4001 TokenExpired → refresh 후 재연결

### 바이너리 프로토콜 (클라이언트 상수)

```typescript
// lib/constants.ts
WsOpCode = { Audio: 0x01, Chat: 0x02, System: 0x03, Heartbeat: 0x04,
             Resync: 0x05, ListenerStatus: 0x06, Reaction: 0x07,
             PingMeasure: 0x08, ResyncWait: 0x09 }
```

### init segment 감지

offset 4~7이 `ftyp` (0x66 0x74 0x79 0x70) → init segment로 판정

---

## i18n (next-intl v4)

### 설정

- 쿠키 기반 locale 감지 (URL 경로 변경 없음)
- 지원: `ko`, `en` (Language enum — 서버 정의)
- 번역 파일: `messages/ko.json`, `messages/en.json`

### 사용

```typescript
// 서버 컴포넌트
const t = await getTranslations('namespace');

// 클라이언트 컴포넌트
const t = useTranslations('room');
```

### t() 호출 규칙

- **반드시 순수 문자열 리터럴**: `t('guestLogin')` ✅
- **변수/연결 금지**: `t(item.label)` ❌, `t(key + 'Desc')` ❌
- 도메인 컴포넌트: `useTranslations('namespace')` 직접 사용
- 공통 컴포넌트: 텍스트를 props로 받음 (내부에서 t() 호출 금지)

### 시스템 채팅 메시지

- `SystemChatEvent` enum (서버 정의 → orval 자동생성)
- `ChatMessageList`의 `sysLabel()`: switch/case로 이벤트별 명시적 t() 호출

---

## 모바일 호환

- 레이아웃: `fixed inset-0` (`100vh`/`100dvh` 금지)
- 퇴장 감지: `pagehide` + `sendBeacon` (`beforeunload` 불안정)
- 스크롤 방지: `overscroll-behavior: none`
- 터치: `touch-manipulation` (300ms 딜레이 제거)
- fixed 요소: 부모에 `transition-*` 금지 (iOS containing block)

---

## URL / 리버스 프록시

- 클라이언트: `window.location.origin` 기반
- 서버 컴포넌트: `getServerApiUrl()` (`INTERNAL_API_URL`)
- WebSocket: `getWsUrl()` — dev/prod 자동 감지
- 빌드 타임 URL 환경 변수 금지 — `lib/urls.ts`에서 런타임 해석

---

## Storybook

- 그룹핑: `Features/Admin/...`, `Features/Player/...`, `Features/Queue/...`, `Primitives/...`
- 스토리 파일: `src/stories/features/<Name>.stories.tsx`
- 실제 API 호출 없이 props 기반 렌더링

---

## 테스트

```bash
cd client && npx vitest          # 유닛 테스트
cd client && npm run storybook   # 스토리북
```
