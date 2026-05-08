import type { ReactNode } from 'react';

const MENTION_REGEX = /@(\S+)/g;

/** 메시지 텍스트에서 @멘션을 하이라이트 span으로 변환 */
export function renderWithMentions(
  text: string,
  currentUserId?: string,
  members?: { userId: string; nickname: string }[],
): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    const mentionNick = match[1];
    const isSelf = members?.some((m) => m.nickname === mentionNick && m.userId === currentUserId);
    parts.push(
      <span
        key={match.index}
        className={`font-medium ${isSelf ? 'rounded bg-sa-accent/20 px-0.5 text-sa-accent' : 'text-sa-accent'}`}
      >
        @{mentionNick}
      </span>,
    );
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  // regex lastIndex 리셋
  MENTION_REGEX.lastIndex = 0;

  return parts.length > 0 ? parts : [text];
}
