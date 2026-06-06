'use client';
import { Ban, Check } from 'lucide-react';
import { memo } from 'react';

import type { SearchResultItem } from '@/api/model';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import Thumbnail from '@/components/common/Thumbnail';
import { Button } from '@/components/common/Button';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

interface SearchTrackItemProps {
  track: SearchResultItem;
  order: number;
  disabled: boolean;
  full: boolean;
  inQueue: boolean;
  onClick: () => void;
  isFavorite?: boolean;
  favLoading?: boolean;
  onToggleFavorite?: () => void;
  isGuest?: boolean;
  /** 비공개/지역제한 등으로 사용 불가 */
  unavailable?: boolean;
  unavailableLabel?: string;
  inQueueLabel?: string;
}

export const SearchTrackItem = memo(function SearchTrackItem({
  track,
  order,
  disabled,
  full,
  inQueue,
  onClick,
  isFavorite,
  favLoading: _favLoading,
  onToggleFavorite,
  isGuest,
  unavailable,
  unavailableLabel,
  inQueueLabel,
}: SearchTrackItemProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      disabled={disabled || unavailable}
      className={cn(
        'flex h-auto w-full items-center gap-3 rounded-xl p-2 text-left',
        order ? 'bg-sa-accent/10 border border-sa-accent/30' : full ? 'opacity-30' : '',
        (disabled || unavailable) && 'opacity-40',
      )}
    >
      <div
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition',
          order ? 'bg-sa-accent text-white' : 'border border-white/10 text-white/20',
        )}
      >
        {order || ''}
      </div>
      <div className="relative shrink-0">
        <Thumbnail src={track.thumbnail} size="sm" className="size-10 rounded" />
        {!isGuest && onToggleFavorite && (
          <FavoriteButton
            active={!!isFavorite}
            onClick={() => onToggleFavorite?.()}
            className="absolute -left-1 -top-1"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{track.name}</p>
        <p className="truncate text-xs text-sa-text-secondary">
          {track.artist}
          {track.durationMs ? ` · ${formatDuration(track.durationMs)}` : ''}
        </p>
      </div>
      {disabled && !inQueue && !unavailable && <Check size={14} className="shrink-0 text-green-400" />}
      {inQueue && <span className="shrink-0 text-xs text-sa-text-muted">{inQueueLabel ?? '재신청 불가'}</span>}
      {unavailable && (
        <span className="flex shrink-0 items-center gap-1 text-xs text-red-400/70">
          <Ban size={12} />
          {unavailableLabel ?? '사용 불가'}
        </span>
      )}
    </Button>
  );
});
