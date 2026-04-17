import { useAdminControllerGetAuditLogs } from '@/api/admin/admin';
import type { AdminControllerGetAuditLogsParams } from '@/api/model';

export function useAdminAuditLogs(params: AdminControllerGetAuditLogsParams) {
  return useAdminControllerGetAuditLogs(params);
}
