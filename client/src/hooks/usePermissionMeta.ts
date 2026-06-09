import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { healthControllerPermissionsMeta } from '@/api/health/health';
import type { PermissionMeta } from '@/api/model';

export function usePermissionMeta() {
  return useQuery<PermissionMeta[]>({
    queryKey: ['permissions', 'meta'],
    queryFn: healthControllerPermissionsMeta,
    staleTime: Infinity,
  });
}

/** 권한 key → 번역 기반 메타 매핑 */
export function usePermLookup() {
  const t = useTranslations('permissions');

  const labels: Record<string, string> = {
    listen: t('listen.label'),
    chat: t('chat.label'),
    reaction: t('reaction.label'),
    search: t('search.label'),
    addQueue: t('addQueue.label'),
    voteSkip: t('voteSkip.label'),
    host: t('host.label'),
  };
  const emojis: Record<string, string> = {
    listen: t('listen.emoji'),
    chat: t('chat.emoji'),
    reaction: t('reaction.emoji'),
    search: t('search.emoji'),
    addQueue: t('addQueue.emoji'),
    voteSkip: t('voteSkip.emoji'),
    host: t('host.emoji'),
  };
  const descriptions: Record<string, string> = {
    listen: t('listen.description'),
    chat: t('chat.description'),
    reaction: t('reaction.description'),
    search: t('search.description'),
    addQueue: t('addQueue.description'),
    voteSkip: t('voteSkip.description'),
    host: t('host.description'),
  };

  return {
    label: (k: string) => labels[k] ?? k,
    emoji: (k: string) => emojis[k] ?? '🔑',
    full: (k: string) => `${emojis[k] ?? '🔑'} ${labels[k] ?? k}`,
    description: (k: string) => descriptions[k] ?? k,
  };
}

/** @deprecated usePermLookup() 사용 */
export function buildPermLookup(meta: PermissionMeta[] | undefined) {
  if (!meta) return { label: (k: string) => k, emoji: (_k: string) => '🔑', full: (k: string) => k };
  const keys = meta.map((m) => m.key);
  return {
    label: (k: string) => k,
    emoji: (_k: string) => '🔑',
    full: (k: string) => k,
    keys,
  };
}
