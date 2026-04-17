import { useAdminControllerGetDashboard, useAdminControllerGetSystemStats } from '@/api/admin/admin';

export function useAdminDashboard() {
  return useAdminControllerGetDashboard();
}

export function useAdminSystemStats() {
  return useAdminControllerGetSystemStats({ query: { refetchInterval: 30_000 } });
}
