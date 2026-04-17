import { useQueryClient } from '@tanstack/react-query';

import {
  getAdminControllerGetUsersQueryKey,
  useAdminControllerGetUsers,
  useAdminControllerUpdateUserRole,
} from '@/api/admin/admin';
import type { AdminControllerGetUsersParams } from '@/api/model';

export function useAdminUsers(params: AdminControllerGetUsersParams) {
  return useAdminControllerGetUsers(params);
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useAdminControllerUpdateUserRole({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getAdminControllerGetUsersQueryKey() });
      },
    },
  });
}
