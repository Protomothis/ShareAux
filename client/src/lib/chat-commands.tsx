import { Ban, MessageSquareOff, MessageSquare, ShieldOff, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

export type CommandTargetType = 'members' | 'banned' | 'muted' | 'none';

export interface SlashCommand {
  name: string;
  description: string;
  icon: ReactNode;
  /** 인자로 유저 선택이 필요한 경우 대상 목록 타입 */
  target: CommandTargetType;
}

/** 호스트 전용 슬래시 명령어 목록 */
export const SLASH_COMMANDS: SlashCommand[] = [
  { name: 'ban', description: '유저 차단', icon: <Ban size={14} />, target: 'members' },
  { name: 'unban', description: '차단 해제', icon: <ShieldOff size={14} />, target: 'banned' },
  { name: 'mute', description: '채팅 금지', icon: <MessageSquareOff size={14} />, target: 'members' },
  { name: 'unmute', description: '채팅 금지 해제', icon: <MessageSquare size={14} />, target: 'muted' },
  { name: 'clear', description: '채팅 초기화', icon: <Trash2 size={14} />, target: 'none' },
];

/** input 값에서 슬래시 명령어 파싱 */
export function parseSlashInput(input: string): { command?: string; filter: string } | null {
  if (!input.startsWith('/')) return null;
  const withoutSlash = input.slice(1);
  const spaceIdx = withoutSlash.indexOf(' ');

  if (spaceIdx === -1) {
    // 아직 명령어 타이핑 중: "/ba" → filter로 명령어 목록 필터
    return { filter: withoutSlash };
  }

  // 명령어 확정 + 인자 타이핑 중: "/ban 유저" → command + filter
  const command = withoutSlash.slice(0, spaceIdx);
  const filter = withoutSlash.slice(spaceIdx + 1);
  return { command, filter };
}
