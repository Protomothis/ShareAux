/** 역할별 표시 설정 — 채팅, 멤버 목록 등에서 공통 사용 */

export type DisplayRole = 'superAdmin' | 'admin' | 'host' | 'member' | 'guest';

interface RoleConfig {
  color: string; // tailwind text color class
  badge: string; // emoji
  label: string; // 한국어 라벨
}

export const ROLE_CONFIG: Record<DisplayRole, RoleConfig> = {
  superAdmin: { color: 'text-sa-accent', badge: '👑', label: '최고 관리자' },
  admin: { color: 'text-amber-400', badge: '🛡️', label: '관리자' },
  host: { color: 'text-emerald-400', badge: '🎧', label: 'DJ' },
  member: { color: 'text-white', badge: '', label: '멤버' },
  guest: { color: 'text-white/60', badge: '', label: '게스트' },
};

/** 아바타 위 장식 위치 */
export const ROLE_AVATAR_DECORATION: Partial<Record<DisplayRole, { emoji: string; position: string }>> = {
  superAdmin: { emoji: '👑', position: '-top-2 left-1/2 -translate-x-1/2' },
  admin: { emoji: '🛡️', position: '-bottom-1 -right-1' },
  host: { emoji: '🎧', position: '-top-1.5 -right-1' },
};

/** 유저의 표시 역할 결정 (우선순위: superAdmin > admin > host > guest > member) */
export function getDisplayRole(role?: string, isHost?: boolean): DisplayRole {
  if (role === 'superAdmin') return 'superAdmin';
  if (role === 'admin') return 'admin';
  if (isHost) return 'host';
  if (role === 'guest') return 'guest';
  return 'member';
}
