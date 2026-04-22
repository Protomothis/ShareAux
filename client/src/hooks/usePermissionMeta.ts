import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import type { PermissionMeta } from '@/api/model';
import { healthControllerPermissionsMeta } from '@/api/health/health';

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
  return {
    label: (k: string) => t(`${k}.label` as 'listen.label'),
    emoji: (k: string) => t(`${k}.emoji` as 'listen.emoji'),
    full: (k: string) => `${t(`${k}.emoji` as 'listen.emoji')} ${t(`${k}.label` as 'listen.label')}`,
    description: (k: string) => t(`${k}.description` as 'listen.description'),
  };
}

/** @deprecated usePermLookup() 사용 */
export function buildPermLookup(meta: PermissionMeta[] | undefined) {
  if (!meta) return { label: (k: string) => k, emoji: (k: string) => '🔑', full: (k: string) => k };
  const keys = meta.map((m) => m.key);
  return {
    label: (k: string) => k,
    emoji: (_k: string) => '🔑',
    full: (k: string) => k,
    keys,
  };
}
