'use client';

import { Heart, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { favoritesControllerBulkRemove, useFavoritesControllerList } from '@/api/favorites/favorites';
import type { FavoriteItem, SearchResultItem } from '@/api/model';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { Button } from '@/components/ui/button';
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
  favLoadingIds?: Set<string>;
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
  favLoadingIds,
  onToggleFavorite,
}: FavoritesListProps) {
  const { data: favorites, isLoading, refetch } = useFavoritesControllerList();
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [editMode, setEditMode] = useState(false);
  const [removeSet, setRemoveSet] = useState<Set<string>>(new Set());

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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditMode(!editMode);
            setRemoveSet(new Set());
          }}
          className="h-8 px-2 text-xs"
        >
          {editMode ? '취소' : '편집'}
        </Button>
      </div>

      {editMode && removeSet.size > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-2">
          <span className="text-xs text-red-400">{removeSet.size}곡 선택됨</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await favoritesControllerBulkRemove({ sourceIds: [...removeSet] });
              for (const id of removeSet) {
                favoriteIds.delete(id);
              }
              setRemoveSet(new Set());
              setEditMode(false);
              toast.success(`${removeSet.size}곡 즐겨찾기 해제`);
              refetch();
            }}
            className="h-7 gap-1 px-2 text-xs text-red-400 hover:text-red-300"
          >
            <Trash2 size={12} />
            일괄 해제
          </Button>
        </div>
      )}

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
              onClick={() => {
                if (editMode) {
                  setRemoveSet((prev) => {
                    const next = new Set(prev);
                    if (next.has(fav.sourceId)) next.delete(fav.sourceId);
                    else next.add(fav.sourceId);
                    return next;
                  });
                } else if (!disabled) {
                  onSelectTrack(track);
                }
              }}
              disabled={!editMode && disabled}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/5',
                order && 'bg-sa-accent/10 border border-sa-accent/30',
                disabled && 'opacity-40',
              )}
            >
              <div
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  editMode && removeSet.has(fav.sourceId)
                    ? 'bg-red-400 text-white'
                    : editMode
                      ? 'border border-white/20'
                      : order
                        ? 'bg-sa-accent text-white'
                        : 'border border-white/10 text-white/20',
                )}
              >
                {editMode ? (removeSet.has(fav.sourceId) ? '✓' : '') : order || ''}
              </div>
              <div className="relative shrink-0">
                <Thumbnail src={fav.thumbnail} size="sm" className="size-10 rounded" />
                <FavoriteButton
                  active={favoriteIds.has(fav.sourceId)}
                  loading={favLoadingIds?.has(fav.sourceId)}
                  onClick={() => onToggleFavorite(track)}
                  className="absolute -left-1 -top-1"
                />
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
