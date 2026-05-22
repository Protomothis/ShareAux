import { useQueryClient } from '@tanstack/react-query';

import {
  getAdminControllerGetReportsQueryKey,
  useAdminControllerGetReports,
  useAdminControllerResolveReport,
} from '@/api/admin/admin';
import type { AdminControllerGetReportsParams } from '@/api/model';

export function useAdminReports(params: AdminControllerGetReportsParams) {
  return useAdminControllerGetReports(params);
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useAdminControllerResolveReport({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getAdminControllerGetReportsQueryKey() });
      },
    },
  });
}
