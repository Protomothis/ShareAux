import { useQueryClient } from '@tanstack/react-query';

import {
  getAdminControllerGetIpBansQueryKey,
  useAdminControllerCreateIpBan,
  useAdminControllerDeleteIpBan,
  useAdminControllerGetIpBans,
} from '@/api/admin/admin';
import type { AdminControllerGetIpBansParams } from '@/api/model';

export function useAdminIpBans(params: AdminControllerGetIpBansParams) {
  return useAdminControllerGetIpBans(params);
}

export function useBanIp() {
  const qc = useQueryClient();
  return useAdminControllerCreateIpBan({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getAdminControllerGetIpBansQueryKey() });
      },
    },
  });
}

export function useUnbanIp() {
  const qc = useQueryClient();
  return useAdminControllerDeleteIpBan({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getAdminControllerGetIpBansQueryKey() });
      },
    },
  });
}
