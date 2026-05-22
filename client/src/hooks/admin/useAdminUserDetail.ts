import { useQueryClient } from '@tanstack/react-query';

import {
  getAdminControllerGetUserDetailQueryKey,
  getAdminControllerGetUsersQueryKey,
  useAdminControllerBanUser,
  useAdminControllerDeleteUser,
  useAdminControllerGetUserDetail,
  useAdminControllerUnbanUser,
  useAdminControllerUpdatePermissions,
  useAdminControllerUpdateUserRole,
} from '@/api/admin/admin';

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

/** 역할 변경 — 유저 목록 + 상세 모두 invalidate */
export function useUpdateUserRole(id?: string) {
  const qc = useQueryClient();
  return useAdminControllerUpdateUserRole({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getAdminControllerGetUsersQueryKey() });
        if (id) void qc.invalidateQueries({ queryKey: getAdminControllerGetUserDetailQueryKey(id) });
      },
    },
  });
}

export function useUpdateUserPermissions(id: string) {
  const invalidate = useInvalidateUserDetail(id);
  return useAdminControllerUpdatePermissions({ mutation: { onSuccess: invalidate } });
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
