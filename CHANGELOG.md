# 변경 이력

## 0.1.2 (2026-04-18)

### 기능 추가

- 에러 코드 체계 통일: 52개 ErrorCode (AUTH/ROOM/PLAYER/QUEUE/SEARCH/ADMIN/CAPTCHA/COMMON)
- 글로벌 에러 toast: 서버 메타(code/title/description) 기반, dev 환경 디버그 정보
- 멤버 액션 메뉴: 클릭 → 권한 관리 / 신고하기 선택
- 신고 기능: ReportModal (사유 선택 + 상세 입력 + API 연동)
- WS 연결 끊김 배너: motion 애니메이션, 재연결 시 자동 사라짐
- 플레이어 썸네일 shimmer: 로딩/전환 시 빛 지나가는 효과
- 플레이어 텍스트 shimmer: 준비중/스킵 중 상태 텍스트

### 버그 수정

- 오디오 곡 전환: prepareResync()로 clearBuffer+gotInit 리셋 통합, stall 3초 자동 resync
- 프로그레스바 점프: streaming 전환 시 서버 elapsedMs 무조건 동기화
- 프로그레스바 드르륵: skipping/preparing 시 elapsed 즉시 리셋, isPlaying=false → idle
- audio.currentTime 보정: streaming일 때만 실행 (이전 곡 위치 오염 방지)
- 큐 애니메이션: seenIdsRef로 React 19 호환, overflow-x-hidden
- 검색 모달 footer: 선택 바 전체 너비 확보
- 게스트 로그인 후 authStore.init() 누락
- 게스트 프로필: 비밀번호/Google연동/탈퇴 숨김
- 방 설정 레이아웃: 신청횟수 초기화/제재 관리 여백 추가

### 개선

- useRoomEvents: onSystem if/else 체인 → 역할별 핸들러 분리
- useAudioControl: elapsedBase 변경 즉시 반영
- 에러 toast 중복 제거 (11개 개별 toast → 글로벌 1곳)
- 신고 관리 페이지: 처리/무시 설명 추가

## 0.1.1 (2026-04-18)

### 기능 추가

- 권한 통합: Kick/CreateRoom/Reorder를 Host 하나로 병합 (9개 → 7개)
- 권한 메타 서버 API (`GET /api/permissions/meta`) — 클라이언트 하드코딩 제거
- 서버 연결 상태 표시: 로그인 페이지에서 서버 미연결 시 안내 + 자동 재시도
- Next.js 시작 시 API 서버 health 체크 로그 (`instrumentation.ts`)
- 초대코드 카드 UX 개선: 이모지+라벨 태그 칩, 만료일 표시

### 버그 수정

- RoomPlayHistory 저장 누락 수정
- 호스트 위임/이관: Host 권한 없는 멤버에게 위임 차단, 호스트 퇴장 시 방 폭파 조건 추가
- 중간 입장자 가사 미표시: streamState 초기화 누락 + lyricsStatus 반영 수정
- 초대코드 생성: 빈 문자열 code validation 오류 수정 + 폼 minLength 안내
- 게스트 호스트 위임 제한 제거 (Host 권한 체크로 대체)
- 검색 자동완성: submit 후에도 리스트가 남는 race condition 수정

### 개선

- DB 정리 페이지: 90일 옵션 제거, 테이블별 용량 표시
- 로그인 페이지 리팩토링: useServerStatus 훅 + ServerStatusScreen 컴포넌트 분리
- shimmer-opacity keyframes globals.css 통합
- lyricsStatus Record 캐스팅 제거 (orval Track 타입 직접 참조)
- docker-compose: client에 INTERNAL_API_URL 환경변수 추가
- AGENTS.md: UI 라벨/메타데이터 하드코딩 금지 규칙 추가

## 0.1.0 (2026-04-17)

첫 공개 릴리스.

### 주요 기능

- 방 생성/참여, 실시간 오디오 스트리밍 (fMP4 AAC over WebSocket)
- 음악 검색, 큐 관리 (드래그 앤 드롭, 투표 스킵, Auto DJ)
- 싱크 가사 (줄/워드 단위 카라오케, Gemini AI 번역, 한글 발음)
- 실시간 채팅 및 이모지 리액션
- 2단계 권한 시스템 (계정 권한 × 방 권한)
- 게스트 접속 (초대 코드 기반)
- 관리자 백오피스 (대시보드, 유저/방/트랙 관리, 감사 로그, IP 차단)
- Google OAuth + 로컬 계정 인증
- 모바일 대응 (iOS Safari ManagedMediaSource 포함)
- Docker 배포 (GHCR 이미지)
