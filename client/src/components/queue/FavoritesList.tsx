'use client';

import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { FolderOpen, Heart, Search, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import {
  favoritesControllerBulkRemove,
  favoritesControllerMoveFavorite,
  useFavoritesControllerList,
  useFavoritesControllerListFolders,
} from '@/api/favorites/favorites';
import type { FavoriteItem, SearchResultItem } from '@/api/model';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import Thumbnail from '../common/Thumbnail';
import { FolderManager } from './FolderManager';
import { FolderSection } from './FolderSection';

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

function sortFavs(list: FavoriteItem[], sort: SortKey): FavoriteItem[] {
  const sorted = [...list];
  switch (sort) {
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'artist':
      return sorted.sort((a, b) => (a.artist ?? '').localeCompare(b.artist ?? ''));
    default:
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

const DROP_PREFIX = 'drop:';

export default function FavoritesList({
  onSelectTrack,
  selectedIds: _selectedIds,
  selectedOrder,
  disabledIds,
  maxReached,
  favoriteIds,
  favLoadingIds,
  onToggleFavorite,
}: FavoritesListProps) {
  const { data: favorites, isLoading, refetch } = useFavoritesControllerList();
  const { data: folders = [], refetch: refetchFolders } = useFavoritesControllerListFolders();
  const t = useTranslations('favorites');
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);
  const [removeSet, setRemoveSet] = useState<Set<string>>(new Set());
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragWidth, setDragWidth] = useState<number | undefined>();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const filterFn = useCallback(
    (list: FavoriteItem[]) => {
      if (!filter.trim()) return list;
      const q = filter.toLowerCase();
      return list.filter((f) => f.name.toLowerCase().includes(q) || f.artist?.toLowerCase().includes(q));
    },
    [filter],
  );

  const grouped = useMemo(() => {
    if (!favorites) return { folders: [], uncategorized: [] };
    const byFolder = new Map<string, FavoriteItem[]>();
    const uncategorized: FavoriteItem[] = [];
    for (const f of favorites) {
      if (f.folderId) {
        const arr = byFolder.get(f.folderId) ?? [];
        arr.push(f);
        byFolder.set(f.folderId, arr);
      } else {
        uncategorized.push(f);
      }
    }
    return {
      folders: folders.map((folder) => ({
        ...folder,
        items: sortFavs(filterFn(byFolder.get(folder.id) ?? []), sort),
      })),
      uncategorized: sortFavs(filterFn(uncategorized), sort),
    };
  }, [favorites, folders, filter, sort, filterFn]);

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleDragStart = (e: DragStartEvent) => {
    setDraggingId(e.active.id as string);
    setDragWidth(e.active.rect.current.translated?.width ?? undefined);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setDraggingId(null);
    const sourceId = e.active.id as string;
    const rawOverId = e.over?.id as string | undefined;
    if (!rawOverId?.startsWith(DROP_PREFIX)) return;
    const dropTarget = rawOverId.slice(DROP_PREFIX.length);
    const targetFolderId = dropTarget === '__uncategorized__' ? null : dropTarget;
    const fav = favorites?.find((f) => f.sourceId === sourceId);
    if (!fav || fav.folderId === targetFolderId) return;
    await favoritesControllerMoveFavorite(sourceId, { folderId: targetFolderId });
    refetch();
    refetchFolders();
    toast.success(t('moved'));
  };

  if (isLoading) {
    return <EmptyState title={t('loading')} />;
  }

  if (!favorites?.length && !folders.length) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFolderManager(true)}
            className="h-8 gap-1 px-2 text-xs"
          >
            <FolderOpen size={12} />
            {t('manageFolder')}
          </Button>
        </div>
        <div className="flex flex-col items-center gap-2 py-12 text-sa-text-muted">
          <Heart size={32} className="text-white/10" />
          <p className="text-sm">{t('empty')}</p>
        </div>
        {showFolderManager && (
          <FolderManager
            onClose={() => {
              setShowFolderManager(false);
              refetchFolders();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full flex-col space-y-3">
        {/* 상단 바 */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sa-text-muted" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="h-8 rounded-lg border-white/10 bg-white/5 pl-8 text-xs"
            />
          </div>
          <Select value={sort} onValueChange={(val) => setSort(val as SortKey)}>
            <SelectTrigger size="sm" className="h-8 w-auto min-w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">{t('sortRecent')}</SelectItem>
              <SelectItem value="oldest">{t('sortOldest')}</SelectItem>
              <SelectItem value="name">{t('sortName')}</SelectItem>
              <SelectItem value="artist">{t('sortArtist')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => setShowFolderManager(true)} className="h-8 px-2 text-xs">
            <FolderOpen size={12} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditMode(!editMode);
              setRemoveSet(new Set());
            }}
            className="h-8 px-2 text-xs"
          >
            {editMode ? t('done') : t('edit')}
          </Button>
        </div>

        {/* 편집 모드 액션 바 */}
        {editMode && removeSet.size > 0 && (
          <div className="flex shrink-0 items-center justify-between rounded-lg bg-white/5 px-3 py-2">
            <span className="text-xs text-sa-text-secondary">{t('selected', { count: removeSet.size })}</span>
            <div className="flex items-center gap-1.5">
              {folders.length > 0 && (
                <Select
                  onValueChange={async (val) => {
                    const v = val as string;
                    const target = v === '__none__' ? null : v;
                    for (const sid of removeSet) await favoritesControllerMoveFavorite(sid, { folderId: target });
                    const count = removeSet.size;
                    setRemoveSet(new Set());
                    setEditMode(false);
                    refetch();
                    refetchFolders();
                    toast.success(t('movedCount', { count }));
                  }}
                >
                  <SelectTrigger size="sm" className="h-7 w-auto min-w-20 text-xs">
                    <SelectValue placeholder={t('moveTo')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('uncategorized')}</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await favoritesControllerBulkRemove({ sourceIds: [...removeSet] });
                  const count = removeSet.size;
                  setRemoveSet(new Set());
                  setEditMode(false);
                  toast.success(t('removedCount', { count }));
                  refetch();
                  refetchFolders();
                }}
                className="h-7 gap-1 px-2 text-xs text-red-400 hover:text-red-300"
              >
                <Trash2 size={12} />
                {t('removeFavorite')}
              </Button>
            </div>
          </div>
        )}

        {/* 스크롤 영역 */}
        <div
          className={cn(
            'min-h-0 flex-1 space-y-2 overflow-x-clip px-0.5',
            draggingId ? 'overflow-y-clip' : 'overflow-y-auto',
          )}
        >
          {grouped.folders.map((folder) => (
            <FolderSection
              key={folder.id}
              folderId={folder.id}
              folderName={folder.name}
              folderColor={folder.color}
              items={folder.items}
              isCollapsed={collapsed.has(folder.id)}
              onToggleCollapse={() => toggleCollapse(folder.id)}
              isDragActive={!!draggingId}
              editMode={editMode}
              removeSet={removeSet}
              selectedOrder={selectedOrder}
              disabledIds={disabledIds}
              maxReached={maxReached}
              favoriteIds={favoriteIds}
              favLoadingIds={favLoadingIds}
              onToggleFavorite={onToggleFavorite}
              onSelectTrack={onSelectTrack}
              onToggleRemove={(sid) =>
                setRemoveSet((prev) => {
                  const next = new Set(prev);
                  if (next.has(sid)) next.delete(sid);
                  else next.add(sid);
                  return next;
                })
              }
            />
          ))}

          <FolderSection
            folderId="__uncategorized__"
            folderName={t('uncategorized')}
            folderColor={null}
            items={grouped.uncategorized}
            isCollapsed={collapsed.has('__uncategorized__')}
            onToggleCollapse={() => toggleCollapse('__uncategorized__')}
            isDragActive={!!draggingId}
            editMode={editMode}
            removeSet={removeSet}
            selectedOrder={selectedOrder}
            disabledIds={disabledIds}
            maxReached={maxReached}
            favoriteIds={favoriteIds}
            favLoadingIds={favLoadingIds}
            onToggleFavorite={onToggleFavorite}
            onSelectTrack={onSelectTrack}
            onToggleRemove={(sid) =>
              setRemoveSet((prev) => {
                const next = new Set(prev);
                if (next.has(sid)) next.delete(sid);
                else next.add(sid);
                return next;
              })
            }
          />
        </div>
      </div>

      {showFolderManager && (
        <FolderManager
          onClose={() => {
            setShowFolderManager(false);
            refetchFolders();
          }}
        />
      )}
      {createPortal(
        <DragOverlay dropAnimation={null}>
          {draggingId
            ? (() => {
                const fav = favorites?.find((f) => f.sourceId === draggingId);
                if (!fav) return null;
                return (
                  <div
                    style={{ width: dragWidth }}
                    className="flex items-center gap-2.5 rounded-xl bg-[#242424] p-2 shadow-2xl ring-1 ring-sa-accent/30"
                  >
                    <Thumbnail src={fav.thumbnail} size="sm" className="size-9 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">{fav.name}</p>
                      <p className="truncate text-[10px] text-sa-text-secondary">{fav.artist}</p>
                    </div>
                  </div>
                );
              })()
            : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}
