import { useTranslations } from 'next-intl';
import { SystemChatEvent } from '@/api/model';

import { getAvatar } from '@/lib/avatar';
import { getDisplayRole, ROLE_CONFIG } from '@/lib/roles';
import type { ChatMessage } from '@/types';

/** userId 끝 4자리로 태그 생성 */
function userTag(userId: string): string {
  return `#${userId.slice(-4)}`;
}

const SYSTEM_KEYS = new Set<string>(Object.values(SystemChatEvent));

interface ChatMessageListProps {
  messages: ChatMessage[];
  bottomRef: React.RefObject<HTMLDivElement | null>;
  hostId?: string;
}

export default function ChatMessageList({ messages, bottomRef, hostId }: ChatMessageListProps) {
  const t = useTranslations('chat');
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" role="log" aria-live="polite">
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="mb-1 text-2xl">💬</p>
            <p className="text-xs text-sa-text-muted">{t('firstMessage')}</p>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {messages.map((m, i) =>
          m.type === 'system' ? (
            <div key={`msg-${i}`} className="animate-fade-in flex items-center gap-2 py-0.5">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-center text-[11px] leading-tight text-white/25 line-clamp-3 break-keep">
                {m.nickname
                  ? `${m.nickname}${SYSTEM_KEYS.has(m.message) ? t(`system.${m.message}`, m.data ?? {}) : m.message}`
                  : SYSTEM_KEYS.has(m.message)
                    ? t(`system.${m.message}`, m.data ?? {})
                    : m.message}
              </span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
          ) : (
            <div key={`msg-${i}`} className="flex animate-fade-in gap-2 text-sm">
              <img
                src={getAvatar(m.nickname || t('anonymous'))}
                alt=""
                className="mt-0.5 size-5 shrink-0 rounded-full"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  {(() => {
                    const dr = getDisplayRole(m.role, m.userId === hostId);
                    const cfg = ROLE_CONFIG[dr];
                    return (
                      <>
                        {cfg.badge && <span className="text-[10px]">{cfg.badge}</span>}
                        <span className={`shrink-0 font-medium ${cfg.color}`}>{m.nickname || t('anonymous')}</span>
                      </>
                    );
                  })()}
                  <span className="shrink-0 text-[10px] text-sa-text-muted">{userTag(m.userId)}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-sa-text-muted">
                    {new Date(m.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="break-words text-white/90">{m.message}</p>
              </div>
            </div>
          ),
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
