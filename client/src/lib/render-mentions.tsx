import type { ReactNode } from 'react';

const MENTION_REGEX = /@(\S+)/g;

/**
 * 메시지 텍스트에서 @멘션을 하이라이트 span으로 변환.
 * currentNickname과 일치하면 self 멘션 스타일 적용.
 */
export function renderWithMentions(text: string, _senderNick?: string, currentNickname?: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    const mentionNick = match[1];
    const isSelf = !!currentNickname && mentionNick === currentNickname;
    parts.push(
      <span
        key={match.index}
        className={isSelf ? 'rounded bg-sa-accent/20 px-0.5 font-medium text-sa-accent' : 'font-medium text-sa-accent'}
      >
        @{mentionNick}
      </span>,
    );
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  MENTION_REGEX.lastIndex = 0;

  return parts.length > 0 ? parts : [text];
}
