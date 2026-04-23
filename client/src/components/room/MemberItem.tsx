import { memo } from 'react';
import { useTranslations } from 'next-intl';

import type { MemberWithPermission } from '@/api/model';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getAvatar } from '@/lib/avatar';
import { getDisplayRole, ROLE_AVATAR_DECORATION, ROLE_CONFIG } from '@/lib/roles';

interface MemberItemProps {
  member: MemberWithPermission;
  isHostUser: boolean;
  hasEnqueuePermission: boolean;
  onSelect: () => void;
}

export default memo(function MemberItem({ member: m, isHostUser, hasEnqueuePermission, onSelect }: MemberItemProps) {
  const t = useTranslations('room');
  const dr = getDisplayRole(m.user?.role, isHostUser);
  const cfg = ROLE_CONFIG[dr];

  const deco = ROLE_AVATAR_DECORATION[dr];

  return (
    <div
      role="listitem"
      onClick={onSelect}
      className="flex cursor-pointer select-none animate-slide-in items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition hover:bg-white/5"
    >
      <div className="relative size-8 shrink-0">
        <div className="size-full overflow-hidden rounded-full">
          <img src={getAvatar(m.user?.nickname ?? m.userId)} alt="" className="size-full" />
        </div>
        {deco && (
          <span className={`absolute text-xs ${deco.position}`} title={cfg.label}>
            {deco.emoji}
          </span>
        )}
      </div>
      <span className="flex-1 truncate">
        <span className={cfg.color}>{m.user?.nickname ?? 'Unknown'}</span>
        <span className="ml-1 text-[10px] text-sa-text-muted">#{m.userId.slice(-4)}</span>
        {dr === 'guest' && (
          <span className="ml-1.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/40">{t('guest')}</span>
        )}
      </span>
      {!hasEnqueuePermission && (
        <Tooltip>
          <TooltipTrigger className="text-xs text-red-400">🚫</TooltipTrigger>
          <TooltipContent>{t('enqueueBanned')}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
});
