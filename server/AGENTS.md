# ShareAux Server — AI 에이전트 레퍼런스

> 루트 `AGENTS.md`의 공통 규칙을 먼저 숙지할 것.

## 기술 스택

NestJS 11 · TypeORM · PostgreSQL 16 · raw `ws` · Passport (Google OAuth + JWT) · yt-dlp · ffmpeg · Gemini API

---

## 필수 규칙

### ESM

- `"module": "nodenext"` — **모든 상대 import에 `.js` 확장자 필수**
- `import { Foo } from './foo.js';` ✅ / `import { Foo } from './foo';` ❌

### 환경 변수

- 인프라 변수 (`DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`): `ConfigService`
- 런타임 설정 (어드민 변경 가능): `SettingsService`
- `process.env` 직접 접근 금지

### 모듈 구조

- 기능별 1모듈 (module + service + controller 같은 디렉토리)
- 여러 모듈에서 참조하는 DTO → `common/dto/`
- 엔티티: camelCase 프로퍼티 + `@Column({ name: 'snake_case' })`
- DTO: `class-validator` 데코레이터, `dto/` 하위 디렉토리

### Swagger enum 노출

- 공유 enum → `common/dto/shared-enums.schema.ts`의 `SharedEnums` 클래스에 등록
- 반드시 `enumName` 지정: `@ApiProperty({ enum: MyEnum, enumName: 'MyEnum' })`
- `enumName` 미지정 시 orval이 `부모DTO명+프로퍼티명`으로 생성 — 금지
- 현재 등록: WsEvent, AutoDjStatus, Language, AuthProvider, SystemChatEvent, OptionKey, MetaStatus, PushEvent, TranslationLang, LyricsStatus, LyricsType

---

## 디렉토리 구조

```
src/
├── main.ts              # 부트스트랩 (Swagger, CORS, cookie-parser, helmet)
├── app.module.ts        # 루트 모듈
├── constants.ts         # 전역 상수 + ErrorMeta (~400줄)
├── auth/                # 인증 (Google OAuth, 로컬, 게스트, JWT)
├── rooms/               # 방 CRUD + WS 게이트웨이 + 채팅 + 리액션
├── player/              # 재생 제어 + 투표 스킵
├── queue/               # 큐 관리
├── search/              # YouTube innertube 파싱
├── services/            # 공유 서비스 (Audio, Ytdlp, Preload, AutoDJ, Lyrics, Settings 등)
├── admin/               # 어드민 (대시보드, 유저, 방, 설정, 메트릭, 정리, 신고)
├── favorites/           # 즐겨찾기 + 폴더
├── tracks/              # 트랙 정보 + 투표
├── push/                # Web Push (VAPID)
├── captcha/             # PoW CAPTCHA
├── test/                # 개발 전용
├── entities/            # TypeORM 엔티티 (22개)
├── types/               # 타입/enum (26개 파일)
├── common/dto/          # 공유 DTO (SharedEnums, WsPayloads, AutoDjTags)
├── guards/              # JwtAuthGuard, AdminGuard, RoomPermissionGuard, ControllerGuard
├── filters/             # GlobalExceptionFilter
├── exceptions/          # AppException
├── middleware/          # IpBanMiddleware
└── migrations/          # TypeORM 마이그레이션
```

---

## 엔티티 (22개)

| 엔티티 | 핵심 관계 |
|--------|-----------|
| User | → InviteCode(ManyToOne) |
| Room | → User(host, ManyToOne) |
| Track | provider+sourceId unique |
| RoomQueue | → Room, Track, User(addedBy) |
| RoomMember | → Room, User (복합 PK) |
| RoomPlayback | → Room(OneToOne), Track |
| RoomPermission | → Room, User |
| RoomBan | → Room, User |
| PlayHistory | → Room, User(playedBy) |
| TrackStats | trackId (1:1 Track) |
| TrackVote | → Track, User |
| UserTrackHistory | → Track, User |
| UserFavorite | → User, Track, UserFavoriteFolder |
| UserFavoriteFolder | → User |
| InviteCode | permissions jsonb |
| RefreshToken | → User (SHA-256 해시 저장) |
| SystemSetting | key-value |
| BannedIp | IP 차단 |
| Report | 신고 |
| AuditLog | 감사 로그 |
| PushSubscription | → User |
| PushSettings | → User |

---

## WebSocket 게이트웨이 (rooms/)

### 3계층 분리

1. **RoomsGateway** — 연결 관리 (인증, 입장/퇴장, heartbeat, grace period)
2. **WsMessageRouter** — opcode별 메시지 처리
3. **WsBroadcaster** — 방 단위 전송 (broadcastToRoom, broadcastSystem, sendToUser)

### 연결 흐름

1. HTTP upgrade → `/ws?roomId=xxx` (쿠키 또는 query token)
2. Origin 검증 (CSWSH 방지), IP ban 체크
3. JWT 검증 → userId, nickname, role
4. 중복 세션/다른 방 정리 (1인 1방)
5. 리스너 등록, heartbeat 시작
6. Grace period (30초) — 재연결 시 퇴장 취소

### Close 코드

| 코드 | 의미 |
|------|------|
| 4001 | 인증 실패 |
| 4002 | Heartbeat timeout |
| 4003 | Kicked |
| 4004 | Room gone |
| 4005 | Banned |
| 4006 | Account deleted |
| 4007 | Duplicate session |
| 4008 | Joined other room |

### WsEvent enum (35개)

방 상태: RoomClosed, RoomUpdated
멤버: UserJoined, UserLeft, UserKicked, HostChanged, PermissionChanged, ListenerCount
재생: PlaybackUpdated, MetadataUpdated, TrackSkipped, TrackUnavailable, TrackPrevious, TrackAdded, UserTrackAdded
큐: QueueUpdated
투표: VoteSkipRequested, VoteSkipPassed, VoteUpdated, TrackVote
가사: LyricsResult, LyricsUpdated
AutoDJ: AutoDjStatus, AutoDjEnabled, AutoDjDisabled
기타: SystemMessage, EnqueueCountsReset, ChatHistory, ChatMuted, ChatCleared, DuplicateSession, JoinedOtherRoom

### WsPayloadMap

- `ws-payload-map.ts`에 이벤트별 payload 타입 매핑
- `broadcastSystem<E extends WsEvent>(event: E, payload: WsPayloadMap[E])` — 컴파일 타임 검증

---

## 오디오 파이프라인

### 핵심 상수 (constants.ts)

```
FFMPEG_BITRATE = '160k'
FFMPEG_FRAG_DURATION = '1000000' (1초 μs)
FFMPEG_MAX_RETRIES = 3
TRACK_END_DELAY_MS = 3000
PRELOAD_MAX_MEMORY_BYTES = 50MB
PRELOAD_MAX_PER_ROOM = 3
PRELOAD_TTL_MS = 30분
```

### StreamState 전이

```
idle → preparing → streaming → idle (자연 종료)
                 → skipping → idle (스킵)
```

### 규칙

- ffmpeg chunk 나오면 **즉시 broadcastChunk** — 모아서 보내기 금지
- `onStart` 콜백: 첫 chunk 전송 시점에 호출
- init segment: `resyncListener`에서만 전송. `broadcastChunk`는 `synced === true`만
- resync 응답에 `recentChunks` 포함 금지 — moof boundary 불일치
- init segment 미준비 시 `ResyncWait`(0x09) 전송
- 듀얼 출력: stdout(fMP4→WS) + fd3(ADTS→HTTP Cast/AirPlay)

---

## 설정 시스템 (SettingsService)

### OptionKey (27개)

| 카테고리 | 키 |
|----------|-----|
| 인증 | auth.guestEnabled, auth.googleEnabled, auth.guestMaxAge, captcha.enabled |
| 시크릿 | secret.googleClientId/Secret, secret.googleCallbackUrl, secret.geminiApiKey, secret.vapidPublicKey/PrivateKey |
| 방 | room.maxMembers, room.maxRoomsPerUser |
| AutoDJ | autodj.enabled, autodj.aiEnabled, autodj.aiModel, autodj.batchSize, autodj.temperature |
| 큐 | queue.maxPerUser, queue.maxDuration |
| 스트리밍 | stream.maxBitrateEnabled, stream.maxBitrate |
| 번역 | translation.enabled/dailyLimit/model/targetLang |
| Push | push.vapidMailto |

### 동작

1. 부팅: DB 전체 로드 → 캐시 (시크릿 복호화)
2. `.env` 시딩: DB에 없는 키는 .env에서 자동 저장
3. VAPID 미설정 시 자동 생성
4. 읽기: `get()`, `getNumber()`, `getBoolean()` — 캐시 우선
5. 쓰기: `set()` — DB upsert + 캐시 갱신 (시크릿은 AES-256-GCM)
6. 핫 리로드: GoogleStrategy, TranslationService

### 새 설정 추가 절차

1. `OptionKey` enum에 키 추가
2. `OPTION_METAS`에 타입/기본값/min/max/secret 정의
3. `SharedEnums`에 등록 (이미 OptionKey 등록됨 — 새 enum이면 추가)
4. orval 재생성

---

## Permission enum (7개)

```
Listen, Chat, Reaction, Search, AddQueue, VoteSkip, Host
```

- 일반 유저 기본: 전부
- 게스트 기본: Listen만
- 방 참여 기본: Host 제외 전부
- `RoomPermissionGuard`로 엔드포인트별 권한 체크

---

## 보안

- **Rate Limiting**: ThrottlerGuard 60req/min, 검색 20, 큐 추가 10
- **IP 자동 차단**: WS flood 감지 시 30분/24시간 ban
- **CSWSH 방지**: Origin 헤더 검증
- **Token Rotation**: Refresh 사용 시 즉시 revoke + 새 쌍
- **시크릿 암호화**: AES-256-GCM (JWT_SECRET을 키로)

---

## 테스트

```bash
cd server && npm test              # 유닛 테스트
cd server && npm run test:e2e      # E2E
```

현재 spec 파일: title-cleaner, innertube-parser, detect-lang, translation, chat-mute
