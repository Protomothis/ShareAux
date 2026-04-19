import { useQueryClient } from '@tanstack/react-query';

import {
  getAdminControllerGetInviteCodesQueryKey,
  useAdminControllerCreateInviteCode,
  useAdminControllerDeactivateInviteCode,
  useAdminControllerDeleteExpiredGuests,
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

export function useDeleteExpiredGuests() {
  return useAdminControllerDeleteExpiredGuests();
}

export function useDeleteInviteCode() {
  const qc = useQueryClient();
  return {
    mutate: async (id: string, opts?: { onSuccess?: () => void }) => {
      const { customFetch } = await import('@/api/mutator');
      await customFetch(`/api/admin/invite-codes/${id}`, { method: 'DELETE' });
      await qc.invalidateQueries({ queryKey: getAdminControllerGetInviteCodesQueryKey() });
      opts?.onSuccess?.();
    },
  };
}
