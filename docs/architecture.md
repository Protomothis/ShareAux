# 아키텍처

## 시스템 개요

```
클라이언트 (Next.js 16)
    │
    ├── HTTP (REST API) ──→ NestJS 서버
    │                          │
    ├── WebSocket ←──────────→ RoomsGateway (raw ws)
    │   ├── 바이너리: 오디오 프레임 (fMP4)
    │   ├── JSON: 시스템 이벤트, 채팅
    │   └── 1바이트: 하트비트, 리액션
    │
    └── MSE (SourceBuffer) ──→ <audio> 재생

NestJS 서버
    │
    ├── media resolver ──→ 오디오 URL 추출
    ├── ffmpeg ──→ fMP4 AAC 트랜스코딩
    ├── PostgreSQL ──→ 영속 데이터
    └── Gemini API ──→ 가사 번역
```

## 오디오 파이프라인

ShareAux의 핵심은 실시간 오디오 스트리밍입니다. 파일을 다운로드하지 않고, 서버에서 인코딩하면서 동시에 모든 클라이언트에 전송합니다.

### 흐름

```
1. 큐에서 다음 곡 선택
2. media resolver로 오디오 스트림 URL 추출
3. ffmpeg으로 fMP4 AAC 트랜스코딩 (-re 실시간 속도)
4. stdout에서 청크 읽기
5. init segment 파싱 → 모든 리스너에게 전송
6. 이후 청크 → 실시간 broadcast
7. 클라이언트: MSE SourceBuffer에 append → <audio> 재생
```

### 주요 설계 결정

- **fMP4 (fragmented MP4)**: MSE가 지원하는 컨테이너. 청크 단위 append 가능
- **AAC 코덱**: 브라우저 호환성 최고 (Safari 포함)
- **`-re` 플래그**: ffmpeg이 실시간 속도로 인코딩 → 균일한 청크 전송
- **init segment 캐싱**: 중간 입장자에게 즉시 전송 가능
- **프리로드**: 다음 3곡을 미리 다운로드하여 곡 전환 지연 최소화

### iOS Safari 대응

iOS Safari는 `MediaSource` 대신 `ManagedMediaSource`를 사용합니다.

- `srcObject = ms.handle` (createObjectURL 대신)
- `startstreaming` 이벤트에서 `play()` 호출
- 유저 제스처 토큰이 첫 `await` 이후 무효화 → `play()`를 async 전에 호출

## WebSocket 프로토콜

단일 WebSocket 연결로 모든 실시간 통신을 처리합니다. 첫 바이트가 OpCode로 메시지 타입을 구분합니다.

| OpCode | 이름 | 방향 | 페이로드 |
|--------|------|------|----------|
| 0x01 | Audio | S→C | 바이너리 (fMP4 청크) |
| 0x02 | Chat | 양방향 | JSON (메시지) |
| 0x03 | System | S→C | JSON (이벤트) |
| 0x04 | Heartbeat | C→S | 없음 |
| 0x05 | Resync | C→S | 없음 (init segment 재요청) |
| 0x06 | ListenerStatus | C→S | 1바이트 (0=off, 1=on) |
| 0x07 | Reaction | C→S | 1바이트 (리액션 인덱스) |
| 0x08 | PingMeasure | 양방향 | 8바이트 Float64 (RTT 측정) |

### 연결 관리

- **하트비트**: 클라이언트 30초, 서버 60초 타임아웃
- **재연결**: exponential backoff (1s → 2s → 4s...)
- **중복 세션**: 같은 방 중복 접속 시 이전 연결 종료 (4007)
- **1인 1방**: 다른 방 입장 시 이전 방 연결 종료 (4008)
- **토큰 만료**: 자동 refresh 후 재연결

## 권한 시스템

2단계 권한 모델:

```
유효 권한 = 계정 권한 ∩ 방 권한
```

- **계정 권한**: 초대 코드 생성 시 설정. 계정에 영구 적용
- **방 권한**: 호스트가 방 내에서 개별 유저에게 설정
- **유효 권한**: 두 권한의 교집합. 계정에서 막으면 방에서 열어도 불가

### 권한 목록

| 권한 | 설명 |
|------|------|
| listen | 음악 듣기 (기본, 비활성화 불가) |
| chat | 채팅 |
| reaction | 리액션 |
| search | 음악 검색 |
| addQueue | 큐에 곡 추가 |
| reorder | 큐 순서 변경 |
| voteSkip | 투표 스킵 |
| kick | 다른 유저 강퇴 |
| createRoom | 방 생성 |

## 가사 시스템

### 검색 우선순위

1. **syncedlyrics (Musixmatch)** — 워드 단위 카라오케 (Enhanced LRC)
2. **외부 서비스 자동 자막** — 줄 단위 LRC 변환
3. **syncedlyrics (일반)** — 줄 단위 LRC

### 번역 파이프라인

```
가사 발견 → 언어 감지 → Gemini API 호출
  ├── 일본어: 한국어 번역 + 한글 발음 (1회 호출)
  ├── 영어/중국어: 한국어 번역만
  └── 한국어: 번역 불필요 (스킵)
```

- 인메모리 큐로 순차 처리
- 일일 호출 제한 (기본 200회)
- 완료 시 WebSocket으로 클라이언트에 알림 → 자동 갱신

## 데이터베이스

TypeORM + PostgreSQL. `synchronize: true`로 스키마 자동 동기화 (개발 환경).

### 주요 엔티티

| 엔티티 | 설명 |
|--------|------|
| User | 사용자 (Google/로컬) |
| Room | 방 설정 및 상태 |
| RoomMember | 방 참여자 |
| RoomPermission | 방 내 개별 권한 |
| RoomQueue | 재생 큐 |
| RoomPlayback | 현재 재생 상태 |
| Track | 트랙 메타데이터 + 가사 |
| InviteCode | 초대 코드 |

## 클라이언트 상태 관리

| 종류 | 도구 | 예시 |
|------|------|------|
| 서버 상태 | react-query | 방 목록, 유저 정보, 큐 |
| 클라이언트 상태 | zustand | 인증 토큰, UI 상태 |
| 실시간 상태 | useState + WebSocket | 재생 상태, 채팅, 멤버 |
| 오디오 | useRef + MSE | SourceBuffer, AudioContext |
