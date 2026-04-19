'use client';

import { Heart, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useFavoritesControllerList } from '@/api/favorites/favorites';
import type { FavoriteItem, SearchResultItem } from '@/api/model';
import { TrackProvider } from '@/api/model';
import { Input } from '@/components/ui/input';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

import Thumbnail from '../common/Thumbnail';

type SortKey = 'recent' | 'oldest' | 'name' | 'artist';

interface FavoritesListProps {
  onSelectTrack: (track: SearchResultItem) => void;
  selectedIds: Set<string>;
  selectedOrder: string[];
  disabledIds: Set<string>;
  maxReached: boolean;
  favoriteIds: Set<string>;
  onToggleFavorite: (track: SearchResultItem) => void;
}

function toSearchResult(f: FavoriteItem): SearchResultItem {
  return {
    provider: f.provider as unknown as SearchResultItem['provider'],
    sourceId: f.sourceId,
    name: f.name,
    artist: f.artist ?? null,
    thumbnail: f.thumbnail ?? null,
    durationMs: f.durationMs,
  };
}

export default function FavoritesList({
  onSelectTrack,
  selectedIds,
  selectedOrder,
  disabledIds,
  maxReached,
  favoriteIds,
  onToggleFavorite,
}: FavoritesListProps) {
  const { data: favorites, isLoading } = useFavoritesControllerList();
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');

  const filtered = useMemo(() => {
    if (!favorites) return [];
    let list = [...favorites];
    if (filter.trim()) {
      const q = filter.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || f.artist?.toLowerCase().includes(q));
    }
    switch (sort) {
      case 'oldest':
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'artist':
        list.sort((a, b) => (a.artist ?? '').localeCompare(b.artist ?? ''));
        break;
      default:
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [favorites, filter, sort]);

  if (isLoading) {
    return <p className="py-12 text-center text-sm text-sa-text-muted">불러오는 중...</p>;
  }

  if (!favorites?.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-sa-text-muted">
        <Heart size={32} className="text-white/10" />
        <p className="text-sm">즐겨찾기한 곡이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sa-text-muted" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="검색..."
            className="h-8 rounded-lg border-white/10 bg-white/5 pl-8 text-xs"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-8 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white"
        >
          <option value="recent">최근 추가</option>
          <option value="oldest">오래된 순</option>
          <option value="name">곡명순</option>
          <option value="artist">아티스트순</option>
        </select>
      </div>

      <p className="text-xs text-sa-text-muted">{filtered.length}곡</p>

      <div className="space-y-1">
        {filtered.map((fav) => {
          const track = toSearchResult(fav);
          const order = selectedOrder.indexOf(fav.sourceId) + 1;
          const inQueue = disabledIds.has(fav.sourceId);
          const disabled = inQueue || (!order && maxReached);
          return (
            <button
              key={fav.id}
              onClick={() => !disabled && onSelectTrack(track)}
              disabled={disabled}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/5',
                order && 'bg-sa-accent/10 border border-sa-accent/30',
                disabled && 'opacity-40',
              )}
            >
              <div
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  order ? 'bg-sa-accent text-white' : 'border border-white/10 text-white/20',
                )}
              >
                {order || ''}
              </div>
              <div className="relative shrink-0">
                <Thumbnail src={fav.thumbnail} size="sm" className="size-10 rounded" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(track);
                  }}
                  className="absolute -left-1 -top-1 rounded-full bg-black/60 p-0.5"
                >
                  <Heart
                    size={12}
                    className={cn(
                      favoriteIds.has(fav.sourceId) ? 'fill-red-400 text-red-400' : 'text-white/50 hover:text-white',
                    )}
                  />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{fav.name}</p>
                <p className="truncate text-xs text-sa-text-secondary">
                  {fav.artist} · {formatDuration(fav.durationMs)}
                </p>
              </div>
              {inQueue && <span className="shrink-0 text-xs text-sa-text-muted">재신청 불가</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
