/**
 * 서버 SearchResultItem DTO 미러
 */
export interface SearchResultItem {
  provider: string;
  sourceId: string;
  name: string;
  artist?: string | null;
  thumbnail?: string | null;
  durationMs: number;
  isOfficial?: boolean;
  views?: number;
}
