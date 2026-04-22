// ─── Throttle ───────────────────────────────────────────
export const THROTTLE_TTL_MS = 60_000;
export const THROTTLE_LIMIT_DEFAULT = 60;
export const THROTTLE_LIMIT_SUGGEST = 60;
export const THROTTLE_LIMIT_SEARCH = 20;
export const THROTTLE_LIMIT_QUEUE_ADD = 10;

// ─── WebSocket ──────────────────────────────────────────
export const WS_HEARTBEAT_INTERVAL_MS = 60_000;
export const WS_GRACE_MS = 30_000;
export const WS_CLOSE_KICKED = 4003;
export const WS_CLOSE_ROOM_GONE = 4004;
export const WS_CLOSE_BANNED = 4005;
export const WS_CLOSE_ACCOUNT_DELETED = 4006;
export const WS_CLOSE_DUPLICATE_SESSION = 4007;
export const WS_CLOSE_JOINED_OTHER_ROOM = 4008;

// ─── Audio / ffmpeg ─────────────────────────────────────
export const FFMPEG_BITRATE = '160k';
export const FFMPEG_FRAG_DURATION = '1000000'; // 1초 (μs)
export const FFMPEG_MAX_RETRIES = 3;
export const FFMPEG_RECENT_CHUNKS = 3;
/** 곡 전환 전 마지막 버퍼 재생 대기 — 클라이언트 버퍼 소진 시간 + 여유 */
export const TRACK_END_DELAY_MS = 3000;

// ─── Preload ────────────────────────────────────────────
export const PRELOAD_MAX_CONCURRENT = 20;
export const PRELOAD_MAX_PER_ROOM = 3;
export const PRELOAD_MAX_MEMORY_BYTES = 50 * 1024 * 1024; // 50MB
export const PRELOAD_MAX_TRACK_DURATION_SEC = 480; // 8분
export const PRELOAD_TTL_MS = 30 * 60 * 1000; // 30분
export const PRELOAD_RETRY_COUNT = 1;

// ─── yt-dlp ─────────────────────────────────────────────
export const YTDLP_TIMEOUT_MS = 15_000;
export const YTDLP_PLAYLIST_TIMEOUT_MS = 30_000;
export const YTDLP_PLAYLIST_MAX_BUFFER = 50 * 1024 * 1024; // 50MB
export const YTDLP_FORMAT = 'bestaudio/best';

// ─── Search / Cache ─────────────────────────────────────
export const SHOWCASE_CACHE_TTL_MS = 10 * 60 * 1000; // 10분

// ─── Admin ──────────────────────────────────────────────
export const ADMIN_INACTIVE_CUTOFF_MS = 12 * 60 * 60 * 1000; // 12시간

// ─── Data Retention ─────────────────────────────────────
export const HISTORY_MAX_PER_ROOM = 200; // 방당 재생 이력 최대 보관
export const TRACK_UNUSED_DAYS = 30; // 미사용 트랙 보관 기간 (일)
export const QUEUE_PLAYED_RETENTION_DAYS = 7; // played=true 큐 아이템 보관 기간 (일)

// ─── Vote Skip ──────────────────────────────────────────
export const VOTE_SKIP_DIVISOR = 2;
export const VOTE_SKIP_MIN_REQUIRED = 1;
export const SKIP_MIN_PLAY_MS = 5_000;

// ─── Auth Validation ────────────────────────────────────
export const AUTH_USERNAME_MIN = 4;
export const AUTH_USERNAME_MAX = 20;
export const AUTH_USERNAME_REGEX = /^[a-z0-9_]+$/;
export const AUTH_PASSWORD_MIN = 8;
export const AUTH_PASSWORD_MAX = 72; // bcrypt limit
export const AUTH_NICKNAME_MIN = 2;
export const AUTH_NICKNAME_MAX = 20;

// ─── Auth ───────────────────────────────────────────────
export const AUTH_ACCESS_EXPIRY_SEC = 900; // 15분
export const AUTH_REFRESH_EXPIRY_SEC = 604_800; // 7일
export const AUTH_GUEST_EXPIRY_SEC = 43_200; // 12시간
export const AUTH_COOKIE_ACCESS = 'sat'; // ShareAux Token
export const AUTH_COOKIE_REFRESH = 'sart'; // ShareAux Refresh Token
export const AUTH_LOGIN_RATE_LIMIT = 5;

// ─── CAPTCHA (PoW) ─────────────────────────────────────
export const CAPTCHA_DIFFICULTY = 'sm' as const; // ~238ms solve time
export const CAPTCHA_ROUNDS = 2;

// ─── AutoDJ ─────────────────────────────────────────────
export const AUTODJ_SCAN_INTERVAL_MS = 60_000; // 안전망 스캔 주기
export const AUTODJ_DEBOUNCE_MS = 5_000; // 이벤트 디바운스
export const AUTODJ_FRESHNESS_HARD_EXCLUDE = 20; // 최근 N곡 완전 제외
export const AUTODJ_FRESHNESS_HISTORY_DEPTH = 100; // 가중치 계산용 이력 깊이
export const AUTODJ_SAME_ARTIST_HARD_LIMIT = 2; // 직전 N곡 같은 아티스트 → 0.1배
export const AUTODJ_SAME_ARTIST_SOFT_LIMIT = 5; // 직전 N곡 같은 아티스트 → 0.5배
export const AUTODJ_MAX_FAIL_COUNT = 3; // 연속 실패 시 일시 중단
export const AUTODJ_CANDIDATE_FETCH_LIMIT = 30; // 후보 fetch 수

// ─── Permission Meta ─────────────────────────────────────
import { ApiProperty } from '@nestjs/swagger';

import { Permission } from './types/permission.enum.js';

export class PermissionMeta {
  @ApiProperty({ enum: Permission, enumName: 'Permission' }) key!: Permission;
}

export const PERMISSION_META: PermissionMeta[] = [
  { key: Permission.Listen },
  { key: Permission.Chat },
  { key: Permission.Reaction },
  { key: Permission.Search },
  { key: Permission.AddQueue },
  { key: Permission.VoteSkip },
  { key: Permission.Host },
];

// ─── Chat Mute ──────────────────────────────────────────
export const CHAT_SPAM_WINDOW_MS = 30_000; // 스팸 감지 윈도우
export const CHAT_SPAM_MAX_COUNT = 15; // 윈도우 내 최대 메시지 수
export const CHAT_DUPE_WINDOW_MS = 15_000; // 중복 감지 윈도우
export const CHAT_DUPE_MAX_COUNT = 4; // 윈도우 내 같은 메시지 최대 수
export const CHAT_MUTE_LEVELS_SEC = [30, 300, 1800, 3600]; // 단계별 제한 시간 (초)
export const CHAT_MUTE_ESCALATION_MS = 3_600_000; // 에스컬레이션 윈도우 (1시간)

// ─── Error Meta ─────────────────────────────────────────
import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from './types/error-code.enum.js';

export interface ErrorMeta {
  code: ErrorCode;
  httpStatus: HttpStatus;
  title: string;
  description: string;
}

export const ERROR_META: Record<ErrorCode, ErrorMeta> = {
  // ── Auth ──
  [ErrorCode.AUTH_001]: {
    code: ErrorCode.AUTH_001,
    httpStatus: HttpStatus.UNAUTHORIZED,
    title: '로그인 실패',
    description: '아이디 또는 비밀번호가 올바르지 않습니다',
  },
  [ErrorCode.AUTH_002]: {
    code: ErrorCode.AUTH_002,
    httpStatus: HttpStatus.UNAUTHORIZED,
    title: '계정 정지',
    description: '정지된 계정입니다',
  },
  [ErrorCode.AUTH_003]: {
    code: ErrorCode.AUTH_003,
    httpStatus: HttpStatus.UNAUTHORIZED,
    title: '초대코드 오류',
    description: '유효하지 않은 초대코드입니다',
  },
  [ErrorCode.AUTH_004]: {
    code: ErrorCode.AUTH_004,
    httpStatus: HttpStatus.UNAUTHORIZED,
    title: '초대코드 만료',
    description: '만료된 초대코드입니다',
  },
  [ErrorCode.AUTH_005]: {
    code: ErrorCode.AUTH_005,
    httpStatus: HttpStatus.UNAUTHORIZED,
    title: '초대코드 한도 초과',
    description: '초대코드 사용 한도를 초과했습니다',
  },
  [ErrorCode.AUTH_006]: {
    code: ErrorCode.AUTH_006,
    httpStatus: HttpStatus.UNAUTHORIZED,
    title: '초대코드 사용 불가',
    description: '이 초대코드로는 회원가입할 수 없습니다',
  },
  [ErrorCode.AUTH_007]: {
    code: ErrorCode.AUTH_007,
    httpStatus: HttpStatus.UNAUTHORIZED,
    title: '초대코드 필요',
    description: '초대코드를 입력하세요',
  },
  [ErrorCode.AUTH_008]: {
    code: ErrorCode.AUTH_008,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '아이디 중복',
    description: '이미 사용 중인 아이디입니다',
  },
  [ErrorCode.AUTH_009]: {
    code: ErrorCode.AUTH_009,
    httpStatus: HttpStatus.UNAUTHORIZED,
    title: '비밀번호 오류',
    description: '비밀번호가 올바르지 않습니다',
  },
  [ErrorCode.AUTH_010]: {
    code: ErrorCode.AUTH_010,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '비밀번호 변경 불가',
    description: '비밀번호 변경을 지원하지 않는 계정입니다',
  },
  [ErrorCode.AUTH_011]: {
    code: ErrorCode.AUTH_011,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '현재 비밀번호 불일치',
    description: '현재 비밀번호가 올바르지 않습니다',
  },
  [ErrorCode.AUTH_012]: {
    code: ErrorCode.AUTH_012,
    httpStatus: HttpStatus.UNAUTHORIZED,
    title: '사용자 없음',
    description: '사용자를 찾을 수 없습니다',
  },
  [ErrorCode.AUTH_013]: {
    code: ErrorCode.AUTH_013,
    httpStatus: HttpStatus.UNAUTHORIZED,
    title: '리프레시 토큰 오류',
    description: '유효하지 않은 리프레시 토큰입니다',
  },
  [ErrorCode.AUTH_014]: {
    code: ErrorCode.AUTH_014,
    httpStatus: HttpStatus.UNAUTHORIZED,
    title: '리프레시 토큰 폐기',
    description: '폐기된 리프레시 토큰입니다',
  },
  [ErrorCode.AUTH_015]: {
    code: ErrorCode.AUTH_015,
    httpStatus: HttpStatus.FORBIDDEN,
    title: 'Google OAuth 미설정',
    description: 'Google OAuth가 설정되지 않았습니다',
  },
  [ErrorCode.AUTH_016]: {
    code: ErrorCode.AUTH_016,
    httpStatus: HttpStatus.UNAUTHORIZED,
    title: 'Google 계정 미연동',
    description: 'Google 계정이 연동되지 않았습니다',
  },
  [ErrorCode.AUTH_017]: {
    code: ErrorCode.AUTH_017,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: 'Google 계정 중복',
    description: '이미 다른 계정에 연동된 Google 계정입니다',
  },
  [ErrorCode.AUTH_018]: {
    code: ErrorCode.AUTH_018,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '탈퇴 불가',
    description: 'SuperAdmin은 탈퇴할 수 없습니다',
  },
  [ErrorCode.AUTH_019]: {
    code: ErrorCode.AUTH_019,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '비밀번호 오류',
    description: '탈퇴 확인 비밀번호가 올바르지 않습니다',
  },

  // ── Room ──
  [ErrorCode.ROOM_001]: {
    code: ErrorCode.ROOM_001,
    httpStatus: HttpStatus.NOT_FOUND,
    title: '방 없음',
    description: '방을 찾을 수 없습니다',
  },
  [ErrorCode.ROOM_002]: {
    code: ErrorCode.ROOM_002,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '방 인원 초과',
    description: '방이 가득 찼습니다',
  },
  [ErrorCode.ROOM_003]: {
    code: ErrorCode.ROOM_003,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '입장 차단',
    description: '이 방에서 추방되어 입장할 수 없습니다',
  },
  [ErrorCode.ROOM_004]: {
    code: ErrorCode.ROOM_004,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '권한 없음',
    description: '호스트만 방 정보를 수정할 수 있습니다',
  },
  [ErrorCode.ROOM_005]: {
    code: ErrorCode.ROOM_005,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '권한 없음',
    description: '호스트만 권한을 변경할 수 있습니다',
  },
  [ErrorCode.ROOM_006]: {
    code: ErrorCode.ROOM_006,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '권한 없음',
    description: 'DJ만 호스트를 위임할 수 있습니다',
  },
  [ErrorCode.ROOM_007]: {
    code: ErrorCode.ROOM_007,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '권한 없음',
    description: 'DJ만 강퇴할 수 있습니다',
  },
  [ErrorCode.ROOM_008]: {
    code: ErrorCode.ROOM_008,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '권한 없음',
    description: 'DJ만 차단 목록을 초기화할 수 있습니다',
  },
  [ErrorCode.ROOM_009]: {
    code: ErrorCode.ROOM_009,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '권한 없음',
    description: 'DJ만 차단을 해제할 수 있습니다',
  },
  [ErrorCode.ROOM_010]: {
    code: ErrorCode.ROOM_010,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '권한 없음',
    description: '호스트만 방을 삭제할 수 있습니다',
  },
  [ErrorCode.ROOM_011]: {
    code: ErrorCode.ROOM_011,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '권한 없음',
    description: '호스트만 방을 초기화할 수 있습니다',
  },
  [ErrorCode.ROOM_012]: {
    code: ErrorCode.ROOM_012,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '자기 강퇴 불가',
    description: '자기 자신을 강퇴할 수 없습니다',
  },
  [ErrorCode.ROOM_013]: {
    code: ErrorCode.ROOM_013,
    httpStatus: HttpStatus.NOT_FOUND,
    title: '멤버 없음',
    description: '멤버를 찾을 수 없습니다',
  },
  [ErrorCode.ROOM_014]: {
    code: ErrorCode.ROOM_014,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '위임 불가',
    description: '호스트 권한이 없는 멤버에게 위임할 수 없습니다',
  },
  [ErrorCode.ROOM_015]: {
    code: ErrorCode.ROOM_015,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '권한 부족',
    description: '계정 권한이 부족합니다',
  },
  [ErrorCode.ROOM_016]: {
    code: ErrorCode.ROOM_016,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '접근 거부',
    description: '해당 작업에 대한 권한이 없습니다',
  },
  [ErrorCode.ROOM_017]: {
    code: ErrorCode.ROOM_017,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '비밀번호 오류',
    description: '방 비밀번호가 올바르지 않습니다',
  },

  // ── Player ──
  [ErrorCode.PLAYER_001]: {
    code: ErrorCode.PLAYER_001,
    httpStatus: HttpStatus.NOT_FOUND,
    title: '재생 중인 곡 없음',
    description: '현재 재생 중인 곡이 없습니다',
  },
  [ErrorCode.PLAYER_002]: {
    code: ErrorCode.PLAYER_002,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '다음 곡 없음',
    description: '다음 곡이 없습니다',
  },
  [ErrorCode.PLAYER_003]: {
    code: ErrorCode.PLAYER_003,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '이전 곡 없음',
    description: '이전 곡이 없습니다',
  },
  [ErrorCode.PLAYER_004]: {
    code: ErrorCode.PLAYER_004,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '곡 전환 중',
    description: '곡 전환 중입니다. 잠시 후 다시 시도하세요',
  },
  [ErrorCode.PLAYER_005]: {
    code: ErrorCode.PLAYER_005,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '스킵 대기',
    description: '재생 시작 후 잠시 뒤에 가능합니다',
  },
  [ErrorCode.PLAYER_006]: {
    code: ErrorCode.PLAYER_006,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '스킵 투표 권한 없음',
    description: '스킵 투표 권한이 없습니다',
  },
  [ErrorCode.PLAYER_007]: {
    code: ErrorCode.PLAYER_007,
    httpStatus: HttpStatus.NOT_FOUND,
    title: '오디오 정보 없음',
    description: '오디오 정보를 찾을 수 없습니다',
  },
  [ErrorCode.PLAYER_008]: {
    code: ErrorCode.PLAYER_008,
    httpStatus: HttpStatus.NOT_FOUND,
    title: '오디오 URL 없음',
    description: '오디오 URL을 찾을 수 없습니다',
  },

  // ── Queue ──
  [ErrorCode.QUEUE_001]: {
    code: ErrorCode.QUEUE_001,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '큐 항목 없음',
    description: '큐 항목을 찾을 수 없습니다',
  },
  [ErrorCode.QUEUE_002]: {
    code: ErrorCode.QUEUE_002,
    httpStatus: HttpStatus.CONFLICT,
    title: '중복 곡',
    description: '이미 큐에 있는 곡입니다',
  },
  [ErrorCode.QUEUE_003]: {
    code: ErrorCode.QUEUE_003,
    httpStatus: HttpStatus.CONFLICT,
    title: '전체 중복',
    description: '모든 곡이 이미 큐에 있습니다',
  },
  [ErrorCode.QUEUE_004]: {
    code: ErrorCode.QUEUE_004,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '큐 한도 초과',
    description: '큐에 최대 50곡까지 추가할 수 있습니다',
  },
  [ErrorCode.QUEUE_005]: {
    code: ErrorCode.QUEUE_005,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '개인 한도 초과',
    description: '1인당 최대 10곡까지 추가할 수 있습니다',
  },
  [ErrorCode.QUEUE_006]: {
    code: ErrorCode.QUEUE_006,
    httpStatus: HttpStatus.CONFLICT,
    title: '버전 충돌',
    description: '다른 사용자가 큐를 수정했습니다. 새로고침 후 다시 시도하세요',
  },
  [ErrorCode.QUEUE_007]: {
    code: ErrorCode.QUEUE_007,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '일괄 추가 한도 초과',
    description: '한 번에 추가할 수 있는 곡 수를 초과했습니다',
  },
  [ErrorCode.QUEUE_008]: {
    code: ErrorCode.QUEUE_008,
    httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    title: '재신청 쿨다운',
    description: '최근 재생된 곡입니다. 잠시 후 다시 신청해주세요',
  },

  // ── Search ──
  [ErrorCode.SEARCH_001]: {
    code: ErrorCode.SEARCH_001,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '검색어 필요',
    description: '검색어 또는 continuation 파라미터가 필요합니다',
  },

  // ── Admin ──
  [ErrorCode.ADMIN_001]: {
    code: ErrorCode.ADMIN_001,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '관리자 권한 필요',
    description: '관리자 권한이 필요합니다',
  },
  [ErrorCode.ADMIN_002]: {
    code: ErrorCode.ADMIN_002,
    httpStatus: HttpStatus.NOT_FOUND,
    title: '사용자 없음',
    description: '사용자를 찾을 수 없습니다',
  },
  [ErrorCode.ADMIN_003]: {
    code: ErrorCode.ADMIN_003,
    httpStatus: HttpStatus.NOT_FOUND,
    title: '초대코드 없음',
    description: '초대코드를 찾을 수 없습니다',
  },
  [ErrorCode.ADMIN_004]: {
    code: ErrorCode.ADMIN_004,
    httpStatus: HttpStatus.NOT_FOUND,
    title: '신고 없음',
    description: '신고를 찾을 수 없습니다',
  },
  [ErrorCode.ADMIN_005]: {
    code: ErrorCode.ADMIN_005,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '역할 변경 불가',
    description: 'SuperAdmin 역할은 변경할 수 없습니다',
  },
  [ErrorCode.ADMIN_006]: {
    code: ErrorCode.ADMIN_006,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '밴 불가',
    description: 'SuperAdmin은 밴할 수 없습니다',
  },
  [ErrorCode.ADMIN_007]: {
    code: ErrorCode.ADMIN_007,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '정리 유형 오류',
    description: '알 수 없는 정리 유형입니다',
  },
  [ErrorCode.ADMIN_008]: {
    code: ErrorCode.ADMIN_008,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '상태 오류',
    description: '상태는 resolved 또는 dismissed여야 합니다',
  },

  // ── Captcha ──
  [ErrorCode.CAPTCHA_001]: {
    code: ErrorCode.CAPTCHA_001,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: 'CAPTCHA 필요',
    description: 'CAPTCHA 인증이 필요합니다',
  },
  [ErrorCode.CAPTCHA_002]: {
    code: ErrorCode.CAPTCHA_002,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: 'CAPTCHA 실패',
    description: 'CAPTCHA 인증에 실패했습니다',
  },

  // ── Common ──
  [ErrorCode.COMMON_001]: {
    code: ErrorCode.COMMON_001,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '접근 거부',
    description: '허용되지 않은 작업입니다',
  },
  [ErrorCode.COMMON_002]: {
    code: ErrorCode.COMMON_002,
    httpStatus: HttpStatus.NOT_FOUND,
    title: '트랙 없음',
    description: '트랙을 찾을 수 없습니다',
  },
  [ErrorCode.COMMON_003]: {
    code: ErrorCode.COMMON_003,
    httpStatus: HttpStatus.NOT_FOUND,
    title: '투표 기록 없음',
    description: '투표 기록이 없습니다',
  },
  [ErrorCode.FAV_001]: {
    code: ErrorCode.FAV_001,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '즐겨찾기 초과',
    description: '즐겨찾기는 최대 200곡까지 가능합니다',
  },
  [ErrorCode.FAV_002]: {
    code: ErrorCode.FAV_002,
    httpStatus: HttpStatus.FORBIDDEN,
    title: '게스트 사용 불가',
    description: '즐겨찾기는 로그인 회원만 사용할 수 있습니다',
  },
  [ErrorCode.FAV_003]: {
    code: ErrorCode.FAV_003,
    httpStatus: HttpStatus.BAD_REQUEST,
    title: '폴더 초과',
    description: '폴더는 최대 20개까지 생성할 수 있습니다',
  },
  [ErrorCode.FAV_004]: {
    code: ErrorCode.FAV_004,
    httpStatus: HttpStatus.NOT_FOUND,
    title: '폴더 없음',
    description: '해당 폴더를 찾을 수 없습니다',
  },
};
