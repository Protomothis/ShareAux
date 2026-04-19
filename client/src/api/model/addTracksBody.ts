/**
 * 서버 AddTracksBody DTO 미러
 */
export interface TrackSource {
  provider: string;
  sourceId: string;
}

export interface AddTracksBody {
  items: TrackSource[];
}
