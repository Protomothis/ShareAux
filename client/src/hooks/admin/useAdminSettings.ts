import { useQueryClient } from '@tanstack/react-query';

import {
  getAdminControllerGetSettingsQueryKey,
  useAdminControllerGetSettings,
  useAdminControllerUpdateSettings,
} from '@/api/admin/admin';

export function useAdminSettings() {
  return useAdminControllerGetSettings();
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useAdminControllerUpdateSettings({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getAdminControllerGetSettingsQueryKey() });
      },
    },
  });
}
