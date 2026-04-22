> 🌐 [English](./README.md) | **한국어**

# ShareAux

셀프호스팅 실시간 음악 공유 플랫폼. 방을 만들고, 함께 음악을 검색하고, WebSocket 기반 실시간 스트리밍으로 모든 참여자가 같은 순간을 공유합니다. 싱크 가사, 채팅, 리액션까지.

<p align="center">
  <img src="docs/images/login-desktop.png" alt="ShareAux" width="720" />
</p>

## 주요 기능

- **실시간 오디오 스트리밍** — WebSocket 바이너리(fMP4 AAC)를 MSE로 재생, 파일 다운로드 없음
- **방 기반 청취** — 방 생성/참여, 동기화된 음악 큐 공유
- **큐 관리** — 드래그 앤 드롭 순서 변경, 투표 스킵, Auto DJ
- **싱크 가사** — 줄/워드 단위 카라오케, AI 번역(Gemini) 및 발음 가이드
- **채팅 & 리액션** — 실시간 채팅, 플로팅 이모지 리액션
- **권한 시스템** — 방 단위 + 계정 단위 세분화된 권한 관리
- **게스트 접속** — 초대 코드 기반, 계정 없이 참여 가능
- **관리자 백오피스** — 대시보드, 유저/방/트랙 관리, 감사 로그, IP 차단
- **모바일 대응** — 반응형 디자인, iOS Safari 호환 (ManagedMediaSource)
- **다국어 지원** — next-intl 기반 한국어/영어, 쿠키 기반 locale 감지
- **셀프호스팅** — GHCR Docker 이미지, `docker compose up` 한 줄로 실행

## 기술 스택

| 계층 | 기술 |
|------|------|
| 서버 | NestJS 11, TypeORM, PostgreSQL 16, raw `ws` WebSocket |
| 클라이언트 | Next.js 16, React 19, Tailwind 4, zustand, react-query, next-intl |
| 인증 | Passport (Google OAuth + 로컬 JWT) |
| 오디오 | 미디어 리졸버 → ffmpeg (fMP4 AAC) → WebSocket 바이너리 → 브라우저 MSE |
| 가사 | syncedlyrics (Musixmatch) + Gemini AI 번역 |
| 인프라 | Docker, GitHub Actions, GHCR |

### 왜 HLS/DASH가 아닌 WebSocket인가?

ShareAux는 "같은 방에서 같이 듣기"가 핵심이라 실시간 동기화가 중요합니다.

| | WebSocket (현재) | HLS/DASH |
|---|---|---|
| 지연 | 1~2초 | 3~10초 |
| 동기화 | 모든 참여자가 같은 지점 청취 | 세그먼트 단위 지연으로 동기화 어려움 |
| 서버 부하 | 직접 전송 (100명 × 16KB/s ≈ 1.6MB/s) | CDN 없으면 동일, CDN 있으면 서버 부하 감소 |
| 외부 의존 | 없음 | CDN 필요 시 비용 발생 |
| 셀프호스팅 | 서버 하나로 완결 | CDN 없이는 이점 없음 |

셀프호스팅 환경에서 CDN 없이 운영하므로 HLS로 전환해도 서버 부하는 동일하고 지연만 늘어납니다. 방당 100명 이하 규모에서는 WebSocket 직접 전송이 가장 단순하고 지연이 짧습니다.

## 빠른 시작

### Docker (권장)

```bash
# 1. 클론 및 설정
git clone https://github.com/Protomothis/ShareAux.git
cd ShareAux
cp .env.example .env
# .env 파일에서 JWT_SECRET을 반드시 변경하세요!
# Google 로그인, 가사 번역 등은 선택 사항입니다.

# 2. 실행 (GHCR 이미지 사용 — 빌드 불필요)
docker compose -f docker-compose.ghcr.yml up -d

# 3. 접속
# http://localhost:3001 → 첫 접속 시 관리자 계정 생성 화면이 나타납니다.
```

> 💡 소스에서 직접 빌드하려면 `docker compose up -d`를 사용하세요.

### 소스에서 실행

자세한 내용은 [개발 가이드](docs/development.md)를 참고하세요.

```bash
# 필수: Node.js 22+, PostgreSQL 16, ffmpeg, 미디어 리졸버, python3

# DB 실행
docker compose up db -d

# 서버 + 클라이언트 실행
./dev.sh up
```

## 첫 사용 가이드

1. **접속** — `http://localhost:3001` (또는 설정한 도메인)
2. **관리자 계정 생성** — 첫 접속 시 자동으로 setup 화면이 나타납니다
3. **초대코드 생성** — 관리자 페이지(`/admin`) → 초대코드 관리 → 새 초대코드 생성
4. **친구 초대** — 초대코드를 공유하면 게스트 입장 또는 회원가입 가능
5. **방 만들기** — 방 목록에서 + 버튼 → 방 이름 입력 → 생성
6. **함께 듣기** — 곡 검색 → 큐에 추가 → 모든 참여자에게 실시간 스트리밍 🎶

> 💡 HTTPS 환경에서 사용해야 iOS Safari에서도 정상 동작합니다.

## 시스템 요구사항

| 항목 | 최소 | 권장 |
|------|------|------|
| RAM | 512MB | 1GB+ |
| 디스크 | 1GB | 5GB+ (곡 캐시) |
| CPU | 1코어 | 2코어+ (동시 스트리밍 시) |
| Docker | 20.10+ | 최신 |
| 네트워크 | WebSocket 지원 필수 | HTTPS + 도메인 |

### 트래픽 예상치 (AAC 128kbps 기준)

| 규모 | 대역폭 | 메모리 |
|------|--------|--------|
| 방 1개 × 10명 | ~1.3Mbps | ~100MB |
| 방 5개 × 20명 | ~13Mbps | ~400MB |
| 방 10개 × 50명 | ~64Mbps | ~800MB |
| 방 10개 × 100명 (극단) | ~128Mbps | ~1GB |

> ffmpeg 프로세스(방당 1개)가 CPU 주요 소비원. 메모리는 Node.js + ffmpeg + WS 연결 합산.

## 문서

- [기능 상세](docs/features.md) — 방, 재생, 가사, 채팅, 권한, 관리자 기능 상세
- [배포 가이드](docs/deployment.md) — Docker 설정, 환경 변수, 리버스 프록시
- [자주 묻는 질문](docs/faq.md) — 재생 안 됨, iOS 이슈, 설정 방법 등
- [개발 가이드](docs/development.md) — 로컬 개발 환경, 필수 도구, 프로젝트 구조
- [아키텍처](docs/architecture.md) — 시스템 설계, 오디오 파이프라인, WebSocket 프로토콜
- [AI 에이전트 규칙](AGENTS.md) — AI 코딩 어시스턴트 사용 시 참고 (Copilot, Cursor, Kiro 등)

## 환경 변수

전체 목록은 [배포 가이드](docs/deployment.md)를 참고하세요.

| 변수 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | O | PostgreSQL 연결 문자열 |
| `JWT_SECRET` | O | JWT 서명 시크릿 |
| `GOOGLE_CLIENT_ID` | - | Google OAuth 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | - | Google OAuth 클라이언트 시크릿 |
| `GEMINI_API_KEY` | - | Gemini API 키 (가사 번역) |
| `CLIENT_URL` | O | 클라이언트 URL (CORS) |

## 프로젝트 성격

ShareAux는 실시간 오디오 스트리밍, WebSocket 통신, MSE(Media Source Extensions) 등 웹 기술의 학습과 시연을 위해 개발된 **교육 및 포트폴리오 목적의 오픈소스 프로젝트**입니다. 상업적 음악 스트리밍 서비스가 아닙니다.

- **비공개, 소규모, 개인적 사용**을 전제로 설계되었습니다
- 초대 코드 기반 비공개 운영을 강력히 권장합니다
- 음악 파일을 저장하지 않으며, 외부 소스에서 실시간 스트리밍합니다
- 호스팅된 콘텐츠의 저작권 준수는 **인스턴스 운영자의 책임**입니다
- 개인정보처리방침(`/privacy`)과 이용약관(`/terms`)을 기본 제공합니다. 셀프호스팅 시 운영 환경에 맞게 수정하세요
- Google OAuth 사용 시 개인정보처리방침 URL이 필요할 수 있습니다

## 라이선스

AGPL-3.0. [LICENSE](LICENSE) 파일을 참고하세요.
