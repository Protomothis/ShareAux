import type { MyPermissionsResponsePermissionsItem } from '@/api/model';
import { useRoomsControllerGetMyPermissions } from '@/api/rooms/rooms';

type P = MyPermissionsResponsePermissionsItem;

export function useMyPermissions(roomId: string) {
  const { data } = useRoomsControllerGetMyPermissions(roomId);
  const perms = data?.permissions ?? [];
  return {
    permissions: perms,
    can: (p: P) => perms.includes(p),
  };
}
