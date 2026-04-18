export enum Permission {
  Listen = 'listen',
  Chat = 'chat',
  Reaction = 'reaction',
  Search = 'search',
  AddQueue = 'addQueue',
  VoteSkip = 'voteSkip',
  Host = 'host',
}

/** 일반 유저(Google) 기본 권한 — 전부 허용 */
export const DEFAULT_USER_PERMISSIONS: Permission[] = Object.values(Permission);

/** 게스트 기본 권한 — Listen만 */
export const DEFAULT_GUEST_PERMISSIONS: Permission[] = [Permission.Listen];

/** 방 참여 시 기본 방 권한 */
export const DEFAULT_ROOM_PERMISSIONS: Permission[] = [
  Permission.Listen,
  Permission.Chat,
  Permission.Reaction,
  Permission.Search,
  Permission.AddQueue,
  Permission.VoteSkip,
];
