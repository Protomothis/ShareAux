'use client';

import { Loader2, Pause, Play, Volume2, VolumeX } from 'lucide-react';

import { useAudioControl } from '@/hooks/useAudioControl';
import { formatDuration } from '@/lib/format';
import type { TrackInfo } from '@/types';

import MarqueeText from '../common/MarqueeText';
import Thumbnail from '../common/Thumbnail';
import { Button } from '../ui/button';
import { VolumeSlider } from '../ui/volume-slider';

interface AudioControlProps {
  track: TrackInfo | null;
  listening: boolean;
  onListenToggle: () => void;
  onVolumeChange: (v: number) => void;
  volume: number;
  elapsedBase?: number;
  syncTime?: number;
  isPlaying?: boolean;
  audioLoading?: boolean;
}

export default function AudioControl({
  track,
  listening,
  onListenToggle,
  onVolumeChange,
  volume,
  elapsedBase = 0,
  syncTime = 0,
  isPlaying,
  audioLoading,
}: AudioControlProps) {
  const { elapsed, muted, effectiveVolume, toggleMute, handleVolumeChange } = useAudioControl({
    elapsedBase,
    syncTime,
    isPlaying,
    volume,
    onVolumeChange,
  });
  const duration = track?.durationMs ?? 0;
  const progress = duration > 0 ? Math.min(elapsed / duration, 1) : 0;

  return (
    <div className="mx-4 mt-2 animate-fade-in rounded-2xl border border-white/10 bg-black/80 p-4 backdrop-blur-2xl">
      <div className="flex items-center gap-3">
        <Button
          variant={listening ? 'accent' : 'ghost'}
          size="circle"
          onClick={onListenToggle}
          disabled={audioLoading}
          className={listening ? '' : 'bg-white/10 hover:bg-white/20'}
          aria-label={audioLoading ? '로딩 중' : listening ? '일시정지' : '재생'}
        >
          {audioLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : listening ? (
            <Pause size={18} />
          ) : (
            <Play size={18} className="ml-0.5" />
          )}
        </Button>

        {track?.thumbnail && track.thumbnail !== 'NA' ? (
          <Thumbnail src={track.thumbnail} size="sm" className="size-10 shrink-0 rounded-lg" />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-lg">🎵</div>
        )}
        <div className="min-w-0 flex-1">
          {track?.name ? (
            <MarqueeText text={track.name} className="text-sm font-medium text-white" />
          ) : (
            <p className="text-sm font-medium text-white">재생 대기 중...</p>
          )}
          <p className="truncate text-xs text-sa-text-secondary">{track?.artist ?? ''}</p>
        </div>

        <Button
          variant="ghost-muted"
          size="icon-sm"
          onClick={toggleMute}
          className="shrink-0 text-sa-text-secondary hover:text-white"
          aria-label={muted ? '음소거 해제' : '음소거'}
        >
          {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </Button>
        <VolumeSlider value={effectiveVolume} onChange={handleVolumeChange} className="w-20" />
      </div>

      {track && (
        <div className="mt-3">
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={Math.round(elapsed)}
            aria-valuemax={duration}
          >
            <div
              className="h-full rounded-full bg-sa-accent transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-sa-text-muted">
            <span>{formatDuration(elapsed)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
