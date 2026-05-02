import { useAdminControllerGetDashboard, useAdminMetricsControllerGetSystemStats } from '@/api/admin/admin';

export function useAdminDashboard() {
  return useAdminControllerGetDashboard();
}

export function useAdminSystemStats() {
  return useAdminMetricsControllerGetSystemStats({ query: { refetchInterval: 30_000 } });
}
