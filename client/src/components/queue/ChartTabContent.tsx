'use client';

import { useEffect, useState } from 'react';

import type { ChartTrack, SearchResultItem, ShowcaseCategory } from '@/api/model';
import { PaginationBar } from '@/components/common/PaginationBar';
import { SkeletonLine } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { SearchTrackItem } from './SearchTrackItem';
import Thumbnail from '@/components/common/Thumbnail';

// ─── GridSkeleton ────────────────────────────────────────

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl p-1.5">
          <SkeletonLine className="aspect-video w-full rounded-lg" />
          <div className="space-y-1 px-0.5">
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-2.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── chartTrackToSearchItem ──────────────────────────────

export function chartTrackToSearchItem(ct: ChartTrack): SearchResultItem {
  return {
    provider: 'yt',
    sourceId: ct.sourceId,
    name: ct.title,
    artist: ct.artist,
    thumbnail: ct.thumbnail,
    durationMs: 0,
  };
}

// ─── ChartTabContent ─────────────────────────────────────

export interface ChartTabContentProps {
  category: ShowcaseCategory;
  onSelectTrack: (track: SearchResultItem) => void;
  selectedIds: Set<string>;
  selectedOrder: string[];
  disabledIds: Set<string>;
  maxReached: boolean;
  favoriteIds?: Set<string>;
  favLoadingIds?: Set<string>;
  onToggleFavorite?: (track: SearchResultItem) => void;
  isGuest?: boolean;
}

export function ChartTabContent({
  category,
  onSelectTrack,
  selectedIds,
  selectedOrder,
  disabledIds,
  maxReached,
  favoriteIds,
  favLoadingIds,
  onToggleFavorite,
  isGuest,
}: ChartTabContentProps) {
  const [tracks, setTracks] = useState<SearchResultItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  const playlistId = category.tracks[0]?.playlistId;

  // page 1 = DB 캐시, page 2+ = playlist API
  useEffect(() => {
    if (page === 1) {
      setTracks(category.tracks.map(chartTrackToSearchItem));
      setTotal(category.tracks.length >= limit ? limit * 5 : category.tracks.length); // 추정 (첫 fetch에서 갱신)
      return;
    }
    if (!playlistId) return;
    setLoading(true);
    fetch(`/api/search/playlist/${playlistId}?page=${page}&limit=${limit}`)
      .then((res) => res.json())
      .then((data: { tracks: SearchResultItem[]; total: number }) => {
        setTracks(data.tracks);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [page, playlistId, category.tracks, limit]);

  // 탭 전환 시 리셋
  useEffect(() => {
    setPage(1);
  }, [playlistId]);

  const totalPages = Math.ceil(total / limit);
  const topItems = page === 1 ? tracks.slice(0, 5) : [];
  const listItems = page === 1 ? tracks.slice(5) : tracks;

  if (loading) return <GridSkeleton />;

  return (
    <div className="space-y-3">
      {topItems.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {topItems.map((item, rank) => {
            const selected = selectedIds.has(item.sourceId);
            const disabled = disabledIds.has(item.sourceId) || (maxReached && !selected);
            return (
              <button
                key={`${item.sourceId}_${rank}`}
                type="button"
                disabled={disabled}
                onClick={() => onSelectTrack(item)}
                className={cn(
                  'flex flex-col gap-1.5 rounded-xl border p-1.5 text-left transition-colors touch-manipulation',
                  selected ? 'border-sa-accent/50 bg-sa-accent/10' : 'border-white/5 bg-white/[0.03]',
                  disabled && 'opacity-40',
                )}
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                  <Thumbnail src={item.thumbnail} size="md" className="h-full w-full rounded-lg" />
                  <span className="absolute left-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-[10px] font-bold text-white/80">
                    {rank + 1}
                  </span>
                  {selected && (
                    <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-sa-accent text-[10px] font-bold text-white shadow">
                      {selectedOrder.indexOf(item.sourceId) + 1}
                    </span>
                  )}
                </div>
                <div className="min-w-0 px-0.5">
                  <p className="line-clamp-1 text-[11px] font-medium text-white">{item.name}</p>
                  <p className="truncate text-[10px] text-sa-text-muted">{item.artist}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {listItems.length > 0 && (
        <div className="space-y-1">
          {listItems.map((item, idx) => (
            <SearchTrackItem
              key={`${item.sourceId}_${idx}`}
              track={item}
              order={selectedOrder.indexOf(item.sourceId) + 1}
              disabled={disabledIds.has(item.sourceId) || (maxReached && !selectedIds.has(item.sourceId))}
              full={maxReached && !selectedIds.has(item.sourceId)}
              inQueue={disabledIds.has(item.sourceId)}
              onClick={() => onSelectTrack(item)}
              isFavorite={favoriteIds?.has(item.sourceId)}
              favLoading={favLoadingIds?.has(item.sourceId)}
              onToggleFavorite={() => onToggleFavorite?.(item)}
              isGuest={isGuest}
            />
          ))}
        </div>
      )}
      <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
