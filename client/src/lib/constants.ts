// 서버 constants.ts 미러링 + 클라이언트 전용 상수

// ─── WebSocket OpCode (server WsOpCode 미러) ─────────────
export const WsOpCode = {
  Audio: 0x01,
  Chat: 0x02,
  System: 0x03,
  Heartbeat: 0x04,
  Resync: 0x05,
  ListenerStatus: 0x06,
  Reaction: 0x07,
  PingMeasure: 0x08,
  ResyncWait: 0x09,
} as const;

// ─── WebSocket Close Code ────────────────────────────────
export const WsCloseCode = {
  TokenExpired: 4001,
  Kicked: 4003,
  RoomGone: 4004,
  DuplicateSession: 4007,
  JoinedOtherRoom: 4008,
} as const;

// ─── Player ──────────────────────────────────────────────
export const SKIP_COOLDOWN_MS = 5_000;

// ─── Queue ───────────────────────────────────────────────
export const MAX_QUEUE_SIZE = 50;

// ─── Chat ────────────────────────────────────────────────
export const MAX_CHAT_LENGTH = 300;

// ─── Auth Validation ─────────────────────────────────────
export const AUTH_USERNAME_MIN = 4;
export const AUTH_USERNAME_MAX = 20;
export const AUTH_USERNAME_REGEX = /^[a-z0-9_]+$/;
export const AUTH_PASSWORD_MIN = 8;
export const AUTH_NICKNAME_MIN = 2;
export const AUTH_NICKNAME_MAX = 20;

// ─── WebSocket Reconnect ─────────────────────────────────
export const WS_MAX_RETRIES = 10;
export const WS_MAX_DELAY = 30_000;

// ─── Enum Labels (admin 등에서 공통 사용) ─────────────

export const ROLE_LABELS: Record<string, string> = {
  user: '일반 유저',
  admin: '관리자',
  superAdmin: '최고 관리자',
  guest: '게스트',
};

export const PROVIDER_LABELS: Record<string, { label: string; variant: 'accent' | 'success' | 'muted' }> = {
  google: { label: 'Google', variant: 'accent' },
  local: { label: 'Local', variant: 'success' },
  invite: { label: '초대', variant: 'muted' },
};

export const PROVIDER_VARIANT: Record<string, 'accent' | 'success' | 'muted'> = {
  google: 'accent',
  local: 'success',
  invite: 'muted',
};

/** @deprecated 서버 /permissions/meta API 사용 권장 — usePermissionMeta() 훅 참조 */
export const PERM_FALLBACK: Record<string, { label: string; emoji: string }> = {
  listen: { label: '음악 듣기', emoji: '🎵' },
  chat: { label: '채팅', emoji: '💬' },
  reaction: { label: '리액션', emoji: '🎉' },
  search: { label: '검색', emoji: '🔍' },
  addQueue: { label: '큐 추가', emoji: '📋' },
  voteSkip: { label: '투표 스킵', emoji: '⏭️' },
  host: { label: '호스트', emoji: '🏠' },
};
