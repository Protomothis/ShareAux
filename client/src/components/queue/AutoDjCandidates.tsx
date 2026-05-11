'use client';

import { ListPlus, Pin, X } from 'lucide-react';

import MarqueeText from '@/components/common/MarqueeText';
import Thumbnail from '@/components/common/Thumbnail';
import { cn } from '@/lib/utils';

export interface CandidateTrack {
  id: string;
  name: string;
  artist: string | null;
  thumbnail: string | null;
  pinned?: boolean;
}

interface AutoDjCandidatesProps {
  candidates: CandidateTrack[];
  onPin: (id: string) => void;
  onSkip: (id: string) => void;
  onEnqueue: (id: string) => void;
  className?: string;
}

export function AutoDjCandidates({ candidates, onPin, onSkip, onEnqueue, className }: AutoDjCandidatesProps) {
  if (!candidates.length) return null;

  return (
    <div className={cn('space-y-1', className)}>
      {candidates.map((track) => (
        <div
          key={track.id}
          className={cn(
            'flex items-center gap-2.5 rounded-lg p-2 transition-colors',
            track.pinned ? 'bg-sa-accent/10 ring-1 ring-inset ring-sa-accent/30' : 'bg-white/[0.03]',
          )}
        >
          <Thumbnail src={track.thumbnail} size="sm" className="size-8 shrink-0 rounded" />
          <div className="min-w-0 flex-1">
            <MarqueeText text={track.name} className="text-xs font-medium text-white" />
            <p className="truncate text-[10px] text-white/40">{track.artist}</p>
          </div>
          <button
            type="button"
            onClick={() => onPin(track.id)}
            className={cn(
              'flex size-7 items-center justify-center rounded-md transition-colors touch-manipulation',
              track.pinned ? 'text-sa-accent' : 'text-white/30 hover:bg-white/5 hover:text-white/60',
            )}
          >
            <Pin size={12} />
          </button>
          <button
            type="button"
            onClick={() => onEnqueue(track.id)}
            className="flex size-7 items-center justify-center rounded-md text-white/30 transition-colors touch-manipulation hover:bg-white/5 hover:text-green-400"
          >
            <ListPlus size={12} />
          </button>
          <button
            type="button"
            onClick={() => onSkip(track.id)}
            className="flex size-7 items-center justify-center rounded-md text-white/30 transition-colors touch-manipulation hover:bg-white/5 hover:text-red-400"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
