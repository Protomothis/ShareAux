import type { PlaylistResult } from '@/api/model';
import type { SearchResultItem } from '@/api/model';
import EmptyState from '@/components/common/EmptyState';
import { useTranslations } from 'next-intl';

import { SearchPlaylistItem } from './SearchPlaylistItem';
import SearchSkeleton from './SearchSkeleton';
import { SearchTrackItem } from './SearchTrackItem';

interface SearchResultsProps {
  loading: boolean;
  loadingMore: boolean;
  debouncedQuery: string;
  results: SearchResultItem[];
  playlists: PlaylistResult[];
  selected: SearchResultItem[];
  disabledIds: Set<string>;
  addedIds: Set<string>;
  queueTrackIds: string[];
  maxSelect: number;
  onToggleTrack: (track: SearchResultItem) => void;
  favoriteIds?: Set<string>;
  favLoadingIds?: Set<string>;
  onToggleFavorite?: (track: SearchResultItem) => void;
  isGuest?: boolean;
}

export default function SearchResults({
  loading,
  loadingMore,
  debouncedQuery,
  results,
  playlists,
  selected,
  disabledIds,
  addedIds,
  queueTrackIds,
  maxSelect,
  onToggleTrack,
  favoriteIds,
  favLoadingIds,
  onToggleFavorite,
  isGuest,
}: SearchResultsProps) {
  const t = useTranslations('search');

  if (loading) {
    return (
      <div className="space-y-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SearchSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!debouncedQuery) {
    return <EmptyState icon="🔍" title={t('emptyHint')} />;
  }

  if (results.length === 0 && playlists.length === 0) {
    return <EmptyState icon="😶" title={t('noResults')} description={t('noResultsHint', { query: debouncedQuery })} />;
  }

  return (
    <div className="space-y-0.5">
      {playlists.map((pl) => (
        <SearchPlaylistItem
          key={pl.playlistId}
          playlist={pl}
          selected={selected}
          disabledIds={disabledIds}
          maxReached={selected.length >= maxSelect}
          onToggleTrack={onToggleTrack}
          favoriteIds={favoriteIds ?? new Set()}
          favLoadingIds={favLoadingIds ?? new Set()}
          onToggleFavorite={onToggleFavorite ?? (() => {})}
          isGuest={isGuest ?? false}
        />
      ))}

      {results.map((track) => {
        const order = selected.findIndex((t) => t.sourceId === track.sourceId) + 1;
        const isDisabled = addedIds.has(track.sourceId) || queueTrackIds.includes(track.sourceId);
        return (
          <SearchTrackItem
            key={track.sourceId}
            track={track}
            order={order}
            disabled={isDisabled}
            full={selected.length >= maxSelect && !order}
            inQueue={queueTrackIds.includes(track.sourceId)}
            onClick={() => !isDisabled && onToggleTrack(track)}
            isFavorite={favoriteIds?.has(track.sourceId)}
            favLoading={favLoadingIds?.has(track.sourceId)}
            onToggleFavorite={() => onToggleFavorite?.(track)}
            isGuest={isGuest}
          />
        );
      })}

      {loadingMore && (
        <div className="flex justify-center py-3">
          <div className="size-5 animate-spin rounded-full border-2 border-sa-accent border-t-transparent" />
        </div>
      )}
    </div>
  );
}
