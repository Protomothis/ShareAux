'use client';

import { Check } from 'lucide-react';
import { memo } from 'react';

import type { Track } from '@/api/model';
import Thumbnail from '@/components/common/Thumbnail';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

interface SearchTrackItemProps {
  track: Track;
  order: number;
  disabled: boolean;
  full: boolean;
  inQueue: boolean;
  onClick: () => void;
}

export const SearchTrackItem = memo(function SearchTrackItem({
  track,
  order,
  disabled,
  full,
  inQueue,
  onClick,
}: SearchTrackItemProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-auto w-full items-center gap-3 rounded-xl p-2 text-left',
        order ? 'bg-sa-accent/10 border border-sa-accent/30' : full ? 'opacity-30' : '',
        disabled && 'opacity-40',
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
      <Thumbnail src={track.thumbnail} size="sm" className="size-10 shrink-0 rounded" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{track.name}</p>
        <p className="truncate text-xs text-sa-text-secondary">
          {track.artist} · {formatDuration(track.durationMs)}
        </p>
      </div>
      {disabled && !inQueue && <Check size={14} className="shrink-0 text-green-400" />}
      {inQueue && <span className="shrink-0 text-xs text-sa-text-muted">신청곡에 있음</span>}
    </Button>
  );
});
