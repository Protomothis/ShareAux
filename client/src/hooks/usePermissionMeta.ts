import { useQuery } from '@tanstack/react-query';

import type { PermissionMeta } from '@/api/model';
import { healthControllerPermissionsMeta } from '@/api/health/health';

export function usePermissionMeta() {
  return useQuery<PermissionMeta[]>({
    queryKey: ['permissions', 'meta'],
    queryFn: healthControllerPermissionsMeta,
    staleTime: Infinity,
  });
}

/** 권한 key → 메타 매핑 유틸 */
export function buildPermLookup(meta: PermissionMeta[] | undefined) {
  if (!meta) return { label: (k: string) => k, emoji: (k: string) => '🔑', full: (k: string) => k };
  const map = new Map(meta.map((m) => [m.key, m]));
  return {
    label: (k: string) => map.get(k)?.label ?? k,
    emoji: (k: string) => map.get(k)?.emoji ?? '🔑',
    full: (k: string) => {
      const m = map.get(k);
      return m ? `${m.emoji} ${m.label}` : k;
    },
  };
}
