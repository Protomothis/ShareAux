import { useQueryClient } from '@tanstack/react-query';

import {
  getAdminControllerGetInviteCodesQueryKey,
  useAdminControllerCreateInviteCode,
  useAdminControllerDeactivateInviteCode,
  useAdminControllerDeleteInviteCode,
  useAdminControllerGetInviteCodes,
} from '@/api/admin/admin';
import type { AdminControllerGetInviteCodesParams } from '@/api/model';

export function useAdminInviteCodes(params: AdminControllerGetInviteCodesParams) {
  return useAdminControllerGetInviteCodes(params);
}

export function useCreateInviteCode() {
  const qc = useQueryClient();
  return useAdminControllerCreateInviteCode({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getAdminControllerGetInviteCodesQueryKey() });
      },
    },
  });
}

export function useDeactivateInviteCode() {
  const qc = useQueryClient();
  return useAdminControllerDeactivateInviteCode({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getAdminControllerGetInviteCodesQueryKey() });
      },
    },
  });
}

export function useDeleteInviteCode() {
  const qc = useQueryClient();
  return useAdminControllerDeleteInviteCode({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getAdminControllerGetInviteCodesQueryKey() });
      },
    },
  });
}
