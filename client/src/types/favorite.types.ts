import type { FavoriteTarget } from '@/hooks/useFavorites';

/** useFavorites 반환값을 props로 전달할 때 사용하는 공통 인터페이스 */
export interface FavoriteActions {
  favoriteIds: Set<string>;
  favLoadingIds: Set<string>;
  toggleFavorite: (track: FavoriteTarget) => void;
}
