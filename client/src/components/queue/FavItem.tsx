'use client';

import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useRef } from 'react';

import type { FavoriteItem } from '@/api/model';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import Thumbnail from '@/components/common/Thumbnail';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

interface FavItemProps {
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
}

export function FavItem({
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
}: FavItemProps) {
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
