import { useAdminTracksControllerGetTopTracks } from '@/api/admin/admin';
import type { AdminTracksControllerGetTopTracksParams } from '@/api/model';

export function useAdminTopTracks(params: AdminTracksControllerGetTopTracksParams) {
  const query = useAdminTracksControllerGetTopTracks(params);
  return {
    ...query,
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? 1,
    limit: query.data?.limit ?? 20,
  };
}
