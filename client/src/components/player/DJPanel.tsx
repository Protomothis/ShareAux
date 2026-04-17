'use client';
import { Loader2, SkipBack, SkipForward } from 'lucide-react';
import { useState } from 'react';

import { playerControllerSkip } from '@/api/player/player';
import { Button } from '@/components/ui/button';
import type { TrackInfo } from '@/types';

import MarqueeText from '../common/MarqueeText';
import Thumbnail from '../common/Thumbnail';

interface DJPanelProps {
  roomId: string;
  track: TrackInfo | null;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function DJPanel({ roomId, track, hasNext, hasPrev }: DJPanelProps) {
  const [skipping, setSkipping] = useState(false);

  const handleSkip = async () => {
    if (skipping) return;
    setSkipping(true);
    try {
      await playerControllerSkip(roomId);
    } catch {
      /* ignore */
    } finally {
      setSkipping(false);
    }
  };

  return (
    <div className="mx-4 mt-4 rounded-2xl backdrop-blur-2xl bg-black/80 border border-white/10 p-5 animate-fade-in">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-sa-accent">🎧 DJ 컨트롤</p>
      <div className="flex items-center gap-5">
        {track?.thumbnail && track.thumbnail !== 'NA' ? (
          <Thumbnail
            src={track.thumbnail}
            size="md"
            className="h-16 w-16 shrink-0 rounded-xl shadow-lg shadow-black/50"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/5 text-2xl">🎵</div>
        )}
        <div className="min-w-0 flex-1">
          {track?.name ? (
            <MarqueeText text={track.name} className="text-xl font-bold text-white" />
          ) : (
            <p className="text-xl font-bold text-white">재생 대기 중...</p>
          )}
          <p className="truncate text-sm text-sa-text-secondary">{track?.artist ?? ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost-muted" size="circle" disabled={!hasPrev || skipping} aria-label="이전곡">
            <SkipBack size={18} />
          </Button>
          <Button
            variant="accent"
            size="circle-lg"
            onClick={handleSkip}
            disabled={!hasNext || skipping}
            className="hover:scale-105"
            aria-label="다음곡"
          >
            {skipping ? <Loader2 size={20} className="animate-spin" /> : <SkipForward size={20} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
