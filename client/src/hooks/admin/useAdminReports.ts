import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  getAdminControllerGetReportsQueryKey,
  getAdminControllerResolveReportUrl,
  useAdminControllerGetReports,
} from '@/api/admin/admin';
import type { AdminControllerGetReportsParams, Report } from '@/api/model';
import { customFetch } from '@/api/mutator';

export function useAdminReports(params: AdminControllerGetReportsParams) {
  return useAdminControllerGetReports(params);
}

interface ResolveParams {
  id: string;
  status: 'resolved' | 'dismissed';
}

export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: ResolveParams) =>
      customFetch<Report>(getAdminControllerResolveReportUrl(id), {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: getAdminControllerGetReportsQueryKey() });
    },
  });
}
