import { useAdminControllerGetTopTracks } from '@/api/admin/admin';
import type { AdminControllerGetTopTracksParams } from '@/api/model';

export function useAdminTopTracks(params: AdminControllerGetTopTracksParams) {
  return useAdminControllerGetTopTracks(params);
}
