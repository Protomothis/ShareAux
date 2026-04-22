'use client';

import {
  DndContext,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { ChevronDown, ChevronRight, FolderOpen, GripVertical, Heart, Search, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  favoritesControllerBulkRemove,
  favoritesControllerMoveFavorite,
  useFavoritesControllerList,
  useFavoritesControllerListFolders,
} from '@/api/favorites/favorites';
import type { FavoriteItem, FolderItem, SearchResultItem } from '@/api/model';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { folderColorClass } from '@/lib/folder-colors';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

import Thumbnail from '../common/Thumbnail';
import { FolderManager } from './FolderManager';

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
  selectedIds,
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

  const handleDragStart = (e: DragStartEvent) => setDraggingId(e.active.id as string);

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
    return <p className="py-12 text-center text-sm text-sa-text-muted">{t('loading')}</p>;
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
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-8 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white"
          >
            <option value="recent">{t('sortRecent')}</option>
            <option value="oldest">{t('sortOldest')}</option>
            <option value="name">{t('sortName')}</option>
            <option value="artist">{t('sortArtist')}</option>
          </select>
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
                <select
                  onChange={async (e) => {
                    const target = e.target.value === '__none__' ? null : e.target.value;
                    for (const sid of removeSet) await favoritesControllerMoveFavorite(sid, { folderId: target });
                    const count = removeSet.size;
                    setRemoveSet(new Set());
                    setEditMode(false);
                    refetch();
                    refetchFolders();
                    toast.success(t('movedCount', { count }));
                    e.target.value = '';
                  }}
                  defaultValue=""
                  className="h-7 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white"
                >
                  <option value="" disabled>
                    {t('moveTo')}
                  </option>
                  <option value="__none__">{t('uncategorized')}</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
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
            'min-h-0 flex-1 space-y-2 overflow-x-hidden',
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
    </DndContext>
  );
}

// --- 폴더 섹션 (droppable = 섹션 전체) ---
interface FolderSectionProps {
  folderId: string;
  folderName: string;
  folderColor: string | null;
  items: FavoriteItem[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isDragActive: boolean;
  editMode: boolean;
  removeSet: Set<string>;
  selectedOrder: string[];
  disabledIds: Set<string>;
  maxReached: boolean;
  favoriteIds: Set<string>;
  favLoadingIds?: Set<string>;
  onToggleFavorite: (track: SearchResultItem) => void;
  onSelectTrack: (track: SearchResultItem) => void;
  onToggleRemove: (sourceId: string) => void;
}

function FolderSection({
  folderId,
  folderName,
  folderColor,
  items,
  isCollapsed,
  onToggleCollapse,
  isDragActive,
  editMode,
  removeSet,
  selectedOrder,
  disabledIds,
  maxReached,
  favoriteIds,
  favLoadingIds,
  onToggleFavorite,
  onSelectTrack,
  onToggleRemove,
}: FolderSectionProps) {
  const t = useTranslations('favorites');
  const dropId = `${DROP_PREFIX}${folderId}`;
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  return (
    <div
      ref={setNodeRef}
      className={cn('rounded-xl transition', isOver && isDragActive && 'bg-sa-accent/10 ring-1 ring-sa-accent/30')}
    >
      <div className="rounded-lg px-2 py-1.5">
        <button onClick={onToggleCollapse} className="flex w-full items-center gap-2 text-left">
          {isCollapsed ? (
            <ChevronRight size={14} className="text-sa-text-muted" />
          ) : (
            <ChevronDown size={14} className="text-sa-text-muted" />
          )}
          {folderColor ? (
            <span className={cn('size-2.5 shrink-0 rounded-full', folderColorClass(folderColor))} />
          ) : (
            <FolderOpen size={14} className="text-sa-text-muted" />
          )}
          <span className="flex-1 truncate text-xs font-medium text-white">{folderName}</span>
          <span className="text-[10px] text-sa-text-muted">{t('trackCount', { count: items.length })}</span>
        </button>
      </div>

      {!isCollapsed && (
        <div className="mt-0.5 space-y-0.5 pl-1">
          {items.map((fav) => {
            const track = toSearchResult(fav);
            const order = selectedOrder.indexOf(fav.sourceId) + 1;
            const inQueue = disabledIds.has(fav.sourceId);
            const disabled = inQueue || (!order && maxReached);
            return (
              <FavItem
                key={fav.id}
                fav={fav}
                order={order}
                disabled={disabled}
                inQueue={inQueue}
                editMode={editMode}
                selected={removeSet.has(fav.sourceId)}
                isFavorite={favoriteIds.has(fav.sourceId)}
                favLoading={favLoadingIds?.has(fav.sourceId)}
                onToggleFavorite={() => onToggleFavorite(track)}
                onClick={() => {
                  if (editMode) onToggleRemove(fav.sourceId);
                  else if (!disabled) onSelectTrack(track);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- 곡 아이템 (draggable — transform 방식) ---
function FavItem({
  fav,
  order,
  disabled,
  inQueue,
  editMode,
  selected,
  isFavorite,
  favLoading,
  onToggleFavorite,
  onClick,
}: {
  fav: FavoriteItem;
  order: number;
  disabled: boolean;
  inQueue: boolean;
  editMode: boolean;
  selected: boolean;
  isFavorite: boolean;
  favLoading?: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}) {
  const t = useTranslations('favorites');
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: fav.sourceId });
  const widthRef = useRef(0);
  const nodeRef = useCallback(
    (el: HTMLElement | null) => {
      setNodeRef(el);
      if (el) widthRef.current = el.offsetWidth;
    },
    [setNodeRef],
  );
  const style: React.CSSProperties | undefined = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
        zIndex: 999,
        position: 'relative',
        width: widthRef.current || undefined,
      }
    : undefined;

  return (
    <div
      ref={nodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        'flex select-none items-center gap-2.5 rounded-xl p-2 text-left hover:bg-white/5',
        order && !editMode && 'bg-sa-accent/10 border border-sa-accent/30',
        disabled && !editMode && 'opacity-40',
        isDragging && '!bg-[#242424] shadow-xl ring-1 ring-sa-accent/30',
      )}
    >
      {editMode ? (
        <div
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
            selected ? 'bg-red-400 text-white' : 'border border-white/20',
          )}
        >
          {selected ? '✓' : ''}
        </div>
      ) : (
        <div
          {...attributes}
          {...listeners}
          className="flex shrink-0 cursor-grab items-center justify-center touch-none text-sa-text-muted max-md:-ml-2 max-md:h-10 max-md:w-10 md:h-6 md:w-6"
        >
          <GripVertical size={14} />
        </div>
      )}

      <div className="relative shrink-0">
        <div className="size-9 overflow-hidden rounded-lg">
          <Thumbnail src={fav.thumbnail} size="sm" className="size-9 rounded-lg" />
        </div>
        {!editMode && (
          <FavoriteButton
            active={isFavorite}
            loading={favLoading}
            onClick={onToggleFavorite}
            className="absolute -left-1.5 -top-1.5 z-10"
            size={11}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-white">{fav.name}</p>
        <p className="truncate text-[10px] text-sa-text-secondary">
          {fav.artist} · {formatDuration(fav.durationMs)}
        </p>
      </div>

      {order > 0 && !editMode && (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sa-accent text-[10px] font-bold text-white">
          {order}
        </span>
      )}
      {inQueue && <span className="shrink-0 text-[10px] text-sa-text-muted">{t('inQueue')}</span>}
    </div>
  );
}
