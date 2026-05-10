'use client';

import { useDroppable } from '@dnd-kit/core';
import { ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { FavoriteItem, SearchResultItem } from '@/api/model';
import { folderColorClass } from '@/lib/folder-colors';
import { favToSearchResult } from '@/lib/track-utils';
import { cn } from '@/lib/utils';

import { FavItem } from './FavItem';

const DROP_PREFIX = 'folder:';

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

export function FolderSection({
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
            const track = favToSearchResult(fav);
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
