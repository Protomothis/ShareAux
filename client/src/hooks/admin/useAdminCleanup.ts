import { useQueryClient } from '@tanstack/react-query';

import {
  getAdminMetricsControllerGetCleanupSummaryQueryKey,
  useAdminMetricsControllerGetCleanupSummary,
  useAdminMetricsControllerRunCleanup,
} from '@/api/admin/admin';

export function useCleanupSummary() {
  return useAdminMetricsControllerGetCleanupSummary();
}

export function useCleanup() {
  const qc = useQueryClient();
  return useAdminMetricsControllerRunCleanup({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getAdminMetricsControllerGetCleanupSummaryQueryKey() });
      },
    },
  });
}
