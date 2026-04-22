import { useAdminControllerGetTopTracks } from '@/api/admin/admin';
import type { AdminControllerGetTopTracksParams } from '@/api/model';

export function useAdminTopTracks(params: AdminControllerGetTopTracksParams) {
  const query = useAdminControllerGetTopTracks(params);
  return {
    ...query,
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? 1,
    limit: query.data?.limit ?? 20,
  };
}
