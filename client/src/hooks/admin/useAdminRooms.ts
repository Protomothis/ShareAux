import { useQueryClient } from '@tanstack/react-query';

import {
  getAdminControllerGetRoomsQueryKey,
  useAdminControllerDeleteRoom,
  useAdminControllerGetLiveRooms,
  useAdminControllerGetRooms,
} from '@/api/admin/admin';
import type { AdminControllerGetRoomsParams } from '@/api/model';

export function useAdminRooms(params: AdminControllerGetRoomsParams) {
  return useAdminControllerGetRooms(params);
}

export function useAdminLiveRooms() {
  return useAdminControllerGetLiveRooms({ query: { refetchInterval: 10_000 } });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useAdminControllerDeleteRoom({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getAdminControllerGetRoomsQueryKey() });
      },
    },
  });
}
