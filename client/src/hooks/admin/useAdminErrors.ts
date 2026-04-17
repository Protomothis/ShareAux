import {
  useAdminControllerGetErrorFile,
  useAdminControllerGetErrorFiles,
  useAdminControllerGetRecentErrors,
} from '@/api/admin/admin';
import type { AdminControllerGetErrorFileParams, AdminControllerGetRecentErrorsParams } from '@/api/model';

export function useAdminErrors(params: AdminControllerGetRecentErrorsParams) {
  return useAdminControllerGetRecentErrors(params);
}

export function useErrorFiles() {
  return useAdminControllerGetErrorFiles();
}

export function useErrorFile(filename: string, params: AdminControllerGetErrorFileParams) {
  return useAdminControllerGetErrorFile(filename, params, { query: { enabled: !!filename } });
}
