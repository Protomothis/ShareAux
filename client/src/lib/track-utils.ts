import type { FavoriteItem, SearchResultItem } from '@/api/model';

/** FavoriteItem → SearchResultItem 변환 */
export function favToSearchResult(fav: FavoriteItem): SearchResultItem {
  return {
    provider: fav.provider,
    sourceId: fav.sourceId,
    name: fav.name,
    artist: fav.artist ?? null,
    thumbnail: fav.thumbnail ?? null,
    durationMs: fav.durationMs,
  };
}
