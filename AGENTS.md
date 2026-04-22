# ShareAux — AI 에이전트 규칙

> AI 코딩 어시스턴트(Copilot, Cursor, Kiro 등)를 사용하여 이 프로젝트에 기여할 때 참고하세요.
> 이 파일은 AI가 프로젝트 컨텍스트를 이해하고 일관된 코드를 생성하도록 돕습니다.

## 프로젝트 개요

셀프호스팅 실시간 음악 공유 플랫폼. 방을 만들고, 음악을 검색하고, 모든 참여자에게 WebSocket 바이너리로 실시간 스트리밍합니다.

```
클라이언트 (Next.js 16) → NestJS API + raw WebSocket → media resolver → ffmpeg (fMP4 AAC) → WS 바이너리 → 브라우저 (MSE)
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
- **UI 라벨/메타데이터 하드코딩 금지** — 서버 API 기반으로 표시
- 인라인 객체 타입 금지 — `types/` 디렉토리에 named interface 정의
- `type` import 사용: `import type { Foo } from './foo.js';`

### 코드 검증

파일 수정 후 반드시 실행:

```bash
npx prettier --write <파일>
npx tsc --noEmit
```

### 브랜치 전략

- `main` — 안정 릴리스. 직접 커밋 금지
- `develop` — 개발 통합 브랜치
- `feat/<이름>`, `fix/<이름>`, `chore/<이름>` — develop에서 분기
- 릴리스: `feat/v{version}` → develop → main 머지 + 태그

### 커밋 메시지

한국어. Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `style:`

### 이슈 & 마일스톤

**이슈 우선 원칙**: 코드 수정 전에 반드시 GitHub 이슈 먼저 작성.

- 버전별 `v{major}.{minor}.{patch}` 마일스톤 생성
- 릴리스 완료 시 마일스톤 close + 태그

### 커밋/푸시/배포

사용자가 명시적으로 요청할 때만 수행.

### CHANGELOG

유저 친화적 — 기술 용어 금지, 체감 변화 중심, 이슈 번호 참조.

---

## 서버 (NestJS 11)

### 기술 스택

NestJS 11 · TypeORM · PostgreSQL 16 · raw `ws` WebSocket · Passport (Google OAuth + JWT) · media resolver · ffmpeg

### ESM 필수

- `"module": "nodenext"` — **모든 상대 import에 `.js` 확장자 필수**

### 규칙

- 환경 변수: `ConfigService` 사용 (`process.env` 직접 접근 금지)
- 엔티티: camelCase 프로퍼티, `@Column({ name: 'snake_case' })`
- DTO: `class-validator` 데코레이터, `dto/` 하위 디렉토리
- WebSocket: raw `ws` 라이브러리 (`socket.io` 아님)
- 기능별 1모듈 (module + service + controller 같은 디렉토리)

### Swagger enum 노출 컨벤션

- 공유 enum은 `common/dto/shared-enums.schema.ts`의 `SharedEnums` 클래스에 등록
- 반드시 `enumName` 지정: `@ApiProperty({ enum: MyEnum, enumName: 'MyEnum' })`
- `enumName` 미지정 시 orval이 `부모DTO명 + 프로퍼티명`으로 생성 (예: `WsEnumsSchemaLanguage`) — 금지
- DTO 내부 enum도 동일: `@ApiProperty({ enum: ErrorCode, enumName: 'ErrorCode' })`

### 오디오 스트리밍 (서버)

- ffmpeg에서 chunk가 나오면 **즉시 `broadcastChunk`** — 모아서 보내지 않음 (burst 금지)
- `onStart` 콜백은 **첫 chunk 전송 시점**에 호출
- `TRACK_END_DELAY_MS`(3초) — 곡 종료 후 클라이언트 버퍼 소진 대기. 스킵 시 즉시 전환
- init segment는 `resyncListener`에서만 전송. `broadcastChunk`는 `synced === true`인 리스너에게만
- resync 응답에 `recentChunks` 포함 금지 — moof boundary 불일치로 파싱 에러
- init segment 미준비 시 `ResyncWait`(0x09) → 클라이언트 2초 후 재시도

---

## 클라이언트 (Next.js 16)

### 기술 스택

Next.js 16 · React 19 · Tailwind 4 · zustand · @tanstack/react-query · shadcn/ui · dnd-kit · motion

### 규칙

- 서버 컴포넌트 기본. `"use client"`는 훅/브라우저 API 필요 시에만
- `components/ui/` shadcn 프리미티브 필수 (인라인 `<button>`, `<input>` 금지)
- 상태: zustand (클라이언트), react-query (서버)
- 스타일: Tailwind 4 + `cn()` (`@/lib/utils.ts`)
- 애니메이션: `motion/react`에서 import (`framer-motion` 아님)
- `client/src/api/`는 orval 자동 생성 — 수동 수정 금지

### API 호출 규칙

- orval 생성 함수만 사용 — `customFetch` 직접 호출 금지
- 서버 타입만 사용 — 클라이언트에서 API 응답 타입 직접 정의 금지
- `as unknown as` 강제 캐스팅 금지 — 서버 DTO 누락 시 서버에서 수정
- enum은 서버에서 정의 — 클라이언트 전용 enum 금지
- 재생성: 서버 DTO 변경 → 서버 재시작 → `cd client && rm src/api/model/index.ts && npx orval`

### React 19 컴파일러 규칙

- ref 변수: `Ref` 접미사 필수 (`goneRef`, `wsRef`)
- 렌더 중 `ref.current` 읽기/쓰기 금지 — `useEffect`, `useCallback`, 이벤트 핸들러에서만
- props/훅 반환값 불변 — 절대 mutate 금지

### MSE 오디오 재생 (useAudio)

- `Audio` + `MediaSource` + `SourceBuffer`는 `init()`에서 1회 생성, 재생성 금지
- 곡 전환: `clearBuffer()` — `sb.abort()` + `sb.remove()`. 새 MediaSource 생성 금지
- `audio.load()` 호출 금지 (재생 상태 리셋, iOS 제스처 토큰 소비)
- `audio.play()`는 `updateend`에서 버퍼 확보(`tryPlay`) 후 호출

#### 적응형 버퍼링

- **상태별 임계값**: startup 2.0s / rebuffer 1.0~2.5s (stall 에스컬레이션) / steady 0.4s
- **stall 감지**: `waiting` → `pause()` → rebuffer → 임계값 확보 후 resume
  - `play()` 직후 500ms 이내 `waiting`은 디코더 초기화 — stall 아님 (`playStartedAtRef`)
- **타임아웃 폴백**: 5초 내 미도달 시 현재 버퍼로 재생
- **`currentTime` 갱신**:
  - 첫 play 전: seek 1회 (버퍼 시작점)
  - 재생 중: drift > 5초일 때만 보정
  - 매 updateend마다 무조건 갱신 금지 — 재생 위치 밀림 버그
- **`buffering` 상태**: 외부 노출 → play 버튼 로딩 표시

#### resync 규칙

- `sendResync`는 `streaming` 전환 시에만 — `preparing`에서는 `prepareResync`(버퍼 정리)만
- 중간 입장(이미 streaming)은 `handleListenToggle`에서 `sendResync`
- 가드: `gotInitRef` + `resettingRef` 두 개만 — useWebSocket에 가드 넣지 말 것
- REST API 초기 상태에서 `trackRef` 즉시 세팅 — 중복 trackChanged 판정 방지

#### 경과 시간 동기화 (useRoomEvents)

- `elapsedBase` + `syncTime`은 단일 state 객체(`timeSync`)로 원자적 업데이트
- listening 중 갱신은 `useAudio`의 `onTimeUpdate` 콜백 — interval 폴링 금지

### 모바일 호환

- 레이아웃: `fixed inset-0` (`100vh`/`100dvh` 금지)
- 퇴장 감지: `pagehide` + `sendBeacon` (`beforeunload` 불안정)
- 스크롤 방지: `overscroll-behavior: none`
- 터치: `touch-manipulation` (300ms 딜레이 제거)
- fixed 요소: 부모에 `transition-*` 금지 (iOS containing block)

### i18n (next-intl)

- `next-intl` v4 — 쿠키 기반 locale 감지 (URL 경로 변경 없음)
- 번역 파일: `messages/ko.json`, `messages/en.json`
- 서버 컴포넌트: `const t = await getTranslations('namespace')`
- 클라이언트 컴포넌트: `const t = useTranslations('namespace')`
- `Language` enum은 서버에서 정의 → orval 자동생성 (`@/api/model`에서 import)
- 클라이언트에서 locale 하드코딩 금지 — `Language` enum 사용
- `global.d.ts`에 `Messages` 타입 augmentation → 잘못된 키 사용 시 tsc 에러

### URL / 리버스 프록시

- 클라이언트: `window.location.origin` 기반
- 서버 컴포넌트: `getServerApiUrl()` (`INTERNAL_API_URL`)
- WebSocket: `getWsUrl()` — dev/prod 자동 감지
- 빌드 타임 URL 환경 변수 금지 — `lib/urls.ts`에서 런타임 해석

---

## 로컬 개발

```bash
./dev.sh up        # DB + 서버 + 클라이언트 일괄 실행
./dev.sh down      # 전부 종료
```

> `nest start`, `next dev` 직접 실행 금지 — `dev.js`를 거치지 않으면 포트 충돌 발생
