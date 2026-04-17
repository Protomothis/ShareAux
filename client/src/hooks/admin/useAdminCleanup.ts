import { useQueryClient } from '@tanstack/react-query';

import {
  getAdminControllerGetCleanupSummaryQueryKey,
  useAdminControllerGetCleanupSummary,
  useAdminControllerRunCleanup,
} from '@/api/admin/admin';

export function useCleanupSummary() {
  return useAdminControllerGetCleanupSummary();
}

export function useCleanup() {
  const qc = useQueryClient();
  return useAdminControllerRunCleanup({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getAdminControllerGetCleanupSummaryQueryKey() });
      },
    },
  });
}
