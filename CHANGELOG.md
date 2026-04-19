# 변경 이력

## 0.1.3 (미정)

### 기능 추가
- 관리자 트랙 목록에 가사 상태/언어 표시
- 관리자 계정 삭제 기능
- 초대코드별 유저 목록 조회 + 게스트 일괄 삭제

### 개선
- 곡 신청 시 목록 즉시 반영 (간헐적 누락 수정)
- 방 삭제 후에도 재생 통계 보존
- 일별 재생 수 차트 정상 표시

### 내부 변경
- 검색 시 DB 저장 제거 — 큐에 추가된 곡만 저장
- 트랙 식별자 `provider` + `sourceId` 체계로 전환 (향후 다중 소스 확장 대비)
- API 호출 orval 자동 생성 함수로 통일

### ⚠️ 업데이트 안내 (v0.1.2 → v0.1.3)

DB 스키마가 변경되었습니다. **업데이트 전 반드시 백업**하세요.

```bash
# 1. 백업
docker compose exec db pg_dump -U spotiparty spotiparty > backup_0.1.2.sql

# 2. 마이그레이션 실행
docker compose exec -T db psql -U spotiparty < migrations/v0.1.2-to-v0.1.3.sql

# 3. 이미지 업데이트
docker compose pull && docker compose up -d
```

신규 설치는 마이그레이션 불필요 — 자동으로 최신 스키마가 생성됩니다.

---

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

### 새 기능

- 서버 연결 안 될 때 로그인 화면에서 상태 안내 표시
- 초대코드 카드에 권한 태그 + 만료일 표시 추가
- 권한 체계 단순화 (호스트 권한 하나로 통합)

### 개선

- DB 정리 페이지에 테이블별 용량 표시
- 호스트 위임 조건 강화 (권한 없는 멤버에게 위임 차단)

### 버그 수정

- 재생 이력이 저장되지 않는 문제 수정
- 중간에 입장한 사용자에게 가사가 안 보이는 문제 수정
- 초대코드 생성 시 짧은 코드 입력 오류 수정
- 검색 후 자동완성 목록이 사라지지 않는 문제 수정

## 0.1.0 (2026-04-17)

첫 공개 릴리스.

### 주요 기능

- 방을 만들고 함께 실시간으로 음악 감상
- YouTube 음악 검색 및 큐 관리 (드래그 정렬, 투표 스킵, Auto DJ)
- 실시간 싱크 가사 (카라오케 모드, AI 번역, 한글 발음 표기)
- 실시간 채팅 및 이모지 리액션
- 초대코드 기반 게스트 접속
- 관리자 페이지 (유저/방/트랙 관리, 감사 로그, IP 차단)
- Google 로그인 + 일반 계정 지원
- 모바일 대응 (iOS Safari 포함)
- Docker 이미지 배포
