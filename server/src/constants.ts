// ─── Throttle ───────────────────────────────────────────
export const THROTTLE_TTL_MS = 60_000;
export const THROTTLE_LIMIT_DEFAULT = 60;
export const THROTTLE_LIMIT_SUGGEST = 60;
export const THROTTLE_LIMIT_SEARCH = 20;
export const THROTTLE_LIMIT_QUEUE_ADD = 10;

// ─── WebSocket ──────────────────────────────────────────
export const WS_HEARTBEAT_INTERVAL_MS = 60_000;
export const WS_GRACE_MS = 5_000;
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
export const STREAM_BUFFER_CHUNKS = 3; // 버스트 전송 전 모을 청크 수 (= 초)

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
export const AUTH_COOKIE_USER = 'sau'; // ShareAux User (비-httpOnly 메타)
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

// ─── Chat Mute ──────────────────────────────────────────
export const CHAT_SPAM_WINDOW_MS = 30_000; // 스팸 감지 윈도우
export const CHAT_SPAM_MAX_COUNT = 15; // 윈도우 내 최대 메시지 수
export const CHAT_DUPE_WINDOW_MS = 15_000; // 중복 감지 윈도우
export const CHAT_DUPE_MAX_COUNT = 4; // 윈도우 내 같은 메시지 최대 수
export const CHAT_MUTE_LEVELS_SEC = [30, 300, 1800, 3600]; // 단계별 제한 시간 (초)
export const CHAT_MUTE_ESCALATION_MS = 3_600_000; // 에스컬레이션 윈도우 (1시간)
