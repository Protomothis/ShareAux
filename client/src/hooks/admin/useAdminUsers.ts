import { useAdminControllerGetUsers } from '@/api/admin/admin';
import type { AdminControllerGetUsersParams } from '@/api/model';

export function useAdminUsers(params: AdminControllerGetUsersParams) {
  return useAdminControllerGetUsers(params);
}
