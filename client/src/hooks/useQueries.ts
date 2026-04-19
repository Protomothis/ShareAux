import { useQueryClient } from '@tanstack/react-query';

import { getPlayerControllerGetStatusQueryKey } from '@/api/player/player';
import {
  getQueueControllerGetHistoryQueryKey,
  getQueueControllerGetMyQuotaQueryKey,
  getQueueControllerGetQueueQueryKey,
} from '@/api/queue/queue';
import type { RoomQueue } from '@/api/model';
import {
  getRoomsControllerFindAllQueryKey,
  getRoomsControllerFindOneQueryKey,
  getRoomsControllerGetMyPermissionsQueryKey,
} from '@/api/rooms/rooms';

export const queryKeys = {
  rooms: getRoomsControllerFindAllQueryKey(),
  room: (id: string) => getRoomsControllerFindOneQueryKey(id),
  queue: (roomId: string) => getQueueControllerGetQueueQueryKey(roomId),
  quota: (roomId: string) => getQueueControllerGetMyQuotaQueryKey(roomId),
  history: (roomId: string) => getQueueControllerGetHistoryQueryKey(roomId),
  player: (roomId: string) => getPlayerControllerGetStatusQueryKey(roomId),
  permissions: (roomId: string) => getRoomsControllerGetMyPermissionsQueryKey(roomId),
};

export function useInvalidate() {
  const qc = useQueryClient();
  return {
    rooms: () => qc.invalidateQueries({ queryKey: queryKeys.rooms }),
    room: (id: string) => qc.invalidateQueries({ queryKey: queryKeys.room(id) }),
    queue: (roomId: string) => qc.invalidateQueries({ queryKey: queryKeys.queue(roomId) }),
    setQueue: (roomId: string, data: RoomQueue[]) => qc.setQueryData(queryKeys.queue(roomId), data),
    quota: (roomId: string) => qc.invalidateQueries({ queryKey: queryKeys.quota(roomId) }),
    history: (roomId: string) => qc.invalidateQueries({ queryKey: queryKeys.history(roomId) }),
    player: (roomId: string) => qc.invalidateQueries({ queryKey: queryKeys.player(roomId) }),
    permissions: (roomId: string) => qc.invalidateQueries({ queryKey: queryKeys.permissions(roomId) }),
  };
}
