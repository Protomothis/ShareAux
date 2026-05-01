import {
  useAdminMetricsControllerGetErrorFile,
  useAdminMetricsControllerGetErrorFiles,
  useAdminMetricsControllerGetRecentErrors,
} from '@/api/admin/admin';
import type {
  AdminMetricsControllerGetErrorFileParams,
  AdminMetricsControllerGetRecentErrorsParams,
} from '@/api/model';

export function useAdminErrors(params: AdminMetricsControllerGetRecentErrorsParams) {
  return useAdminMetricsControllerGetRecentErrors(params);
}

export function useErrorFiles() {
  return useAdminMetricsControllerGetErrorFiles();
}

export function useErrorFile(filename: string, params: AdminMetricsControllerGetErrorFileParams) {
  return useAdminMetricsControllerGetErrorFile(filename, params, { query: { enabled: !!filename } });
}
