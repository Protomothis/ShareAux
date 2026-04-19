import type { PlaylistResult } from '@/api/model';
import type { SearchResultItem } from '@/api/model';
import EmptyState from '@/components/common/EmptyState';

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
    return <EmptyState icon="🔍" title="곡 제목이나 아티스트를 검색하세요" />;
  }

  if (results.length === 0 && playlists.length === 0) {
    return (
      <EmptyState
        icon="😶"
        title="검색 결과가 없습니다"
        description={`"${debouncedQuery}"에 대한 결과를 찾지 못했어요.\n다른 키워드로 검색해 보세요.`}
      />
    );
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
