import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  getAdminControllerGetUserDetailQueryKey,
  getAdminControllerGetUsersQueryKey,
  useAdminControllerBanUser,
  useAdminControllerDeleteUser,
  useAdminControllerGetUserDetail,
  useAdminControllerUnbanUser,
  useAdminControllerUpdateUserRole,
} from '@/api/admin/admin';
import type { UpdatePermissionsBody } from '@/api/model';
import { customFetch } from '@/api/mutator';

export function useAdminUserDetail(id: string) {
  return useAdminControllerGetUserDetail(id);
}

function useInvalidateUserDetail(id: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: getAdminControllerGetUserDetailQueryKey(id) });
    void qc.invalidateQueries({ queryKey: getAdminControllerGetUsersQueryKey() });
  };
}

export function useUpdateUserDetailRole(id: string) {
  const invalidate = useInvalidateUserDetail(id);
  return useAdminControllerUpdateUserRole({ mutation: { onSuccess: invalidate } });
}

export function useUpdateUserPermissions(id: string) {
  const invalidate = useInvalidateUserDetail(id);
  return useMutation({
    mutationFn: (body: UpdatePermissionsBody) =>
      customFetch<void>(`/api/admin/users/${id}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}

export function useBanUser(id: string) {
  const invalidate = useInvalidateUserDetail(id);
  return useAdminControllerBanUser({ mutation: { onSuccess: invalidate } });
}

export function useUnbanUser(id: string) {
  const invalidate = useInvalidateUserDetail(id);
  return useAdminControllerUnbanUser({ mutation: { onSuccess: invalidate } });
}

export function useDeleteUser(id: string) {
  const invalidate = useInvalidateUserDetail(id);
  return useAdminControllerDeleteUser({ mutation: { onSuccess: invalidate } });
}
