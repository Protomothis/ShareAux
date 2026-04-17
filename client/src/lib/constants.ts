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

export const ACCOUNT_PERM_OPTIONS: { key: string; label: string; disabled?: boolean }[] = [
  { key: 'listen', label: '🎵 음악 듣기', disabled: true },
  { key: 'chat', label: '💬 채팅' },
  { key: 'reaction', label: '🎉 리액션' },
  { key: 'search', label: '🔍 검색' },
  { key: 'addQueue', label: '📋 큐 추가' },
  { key: 'reorder', label: '🔀 순서 변경' },
  { key: 'voteSkip', label: '⏭️ 투표 스킵' },
  { key: 'kick', label: '👢 강퇴' },
  { key: 'createRoom', label: '🚪 방 만들기' },
];

/** 권한 key → 이모지 매핑 (카드 등 간략 표시용) */
export const PERM_EMOJI: Record<string, string> = Object.fromEntries(
  ACCOUNT_PERM_OPTIONS.map((o) => [o.key, o.label.split(' ')[0]]),
);

export const GUEST_PERM_OPTIONS = ACCOUNT_PERM_OPTIONS.filter((o) => !['search', 'kick'].includes(o.key));
