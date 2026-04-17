'use client';

import { Loader2, Pause, Play, SkipBack, SkipForward, Type, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';

import { playerControllerPrevious, playerControllerSkip } from '@/api/player/player';
import type { StreamState, VisualMode } from '@/types';

import { Button } from '../ui/button';

import { SKIP_COOLDOWN_MS } from '@/lib/constants';
import { VolumeSlider } from '../ui/volume-slider';
import { VISUAL_MODES } from './Visualizer';
import VoteSkip from './VoteSkip';

interface PlayerControlsProps {
  roomId: string;
  isHost: boolean;
  canVoteSkip: boolean;
  listening: boolean;
  audioLoading?: boolean;
  volume: number;
  muted: boolean;
  effectiveVolume: number;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
  onListenToggle: () => void;
  skipVotes: number;
  skipRequired: number;
  trackName?: string;
  hasNext: boolean;
  hasPrev: boolean;
  elapsedMs: number;
  getAnalyser?: () => AnalyserNode | null;
  showLyrics: boolean;
  onToggleLyrics: () => void;
  visualMode: VisualMode;
  onCycleVisual: () => void;
  streamState?: StreamState;
}

export default function PlayerControls({
  roomId,
  isHost,
  canVoteSkip,
  listening,
  audioLoading,
  volume,
  muted,
  effectiveVolume,
  onVolumeChange,
  onToggleMute,
  onListenToggle,
  skipVotes,
  skipRequired,
  trackName,
  hasNext,
  hasPrev,
  elapsedMs,
  getAnalyser,
  showLyrics,
  onToggleLyrics,
  visualMode,
  onCycleVisual,
  streamState,
}: PlayerControlsProps) {
  const [skipping, setSkipping] = useState<'prev' | 'next' | false>(false);
  const cooldown = elapsedMs < SKIP_COOLDOWN_MS;
  const transitioning = streamState === 'preparing' || streamState === 'skipping';

  const handleSkip = async () => {
    if (skipping) return;
    setSkipping('next');
    try {
      await playerControllerSkip(roomId);
    } catch {
      /* */
    } finally {
      setSkipping(false);
    }
  };

  const handlePrev = async () => {
    if (skipping) return;
    setSkipping('prev');
    try {
      await playerControllerPrevious(roomId);
    } catch {
      /* */
    } finally {
      setSkipping(false);
    }
  };

  return (
    <div className="flex select-none items-center gap-2 px-4 pb-4 pt-2">
      {/* 재생/정지 */}
      <Button
        variant={listening ? 'accent' : 'ghost-muted'}
        size="circle-sm"
        onClick={onListenToggle}
        disabled={audioLoading}
        className={listening ? 'size-9' : 'size-9 bg-white/[0.08] text-white/70 hover:bg-white/[0.12] hover:text-white'}
        aria-label={audioLoading ? '로딩 중' : listening ? '일시정지' : '재생'}
      >
        {audioLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : listening ? (
          <Pause size={16} />
        ) : (
          <Play size={16} className="ml-0.5" />
        )}
      </Button>

      {/* DJ: 이전/다음 */}
      {isHost && (
        <>
          <Button
            variant="ghost-muted"
            size="icon"
            onClick={handlePrev}
            disabled={!hasPrev || !!skipping || cooldown || transitioning}
            className="size-8 rounded-full text-white/40"
            aria-label="이전곡"
          >
            {skipping === 'prev' ? (
              <Loader2 size={15} className="animate-spin text-sa-accent" />
            ) : (
              <SkipBack size={15} />
            )}
          </Button>
          <Button
            variant="ghost-muted"
            size="icon"
            onClick={handleSkip}
            disabled={!hasNext || !!skipping || cooldown || transitioning}
            className="size-8 rounded-full text-white/40"
            aria-label="다음곡"
          >
            {skipping === 'next' ? (
              <Loader2 size={15} className="animate-spin text-sa-accent" />
            ) : (
              <SkipForward size={15} />
            )}
          </Button>
        </>
      )}

      {/* 비DJ: 투표 스킵 */}
      {!isHost && canVoteSkip && trackName && !transitioning && (
        <VoteSkip
          roomId={roomId}
          currentVotes={skipVotes}
          required={skipRequired}
          trackId={trackName}
          hasNext={hasNext}
          elapsedMs={elapsedMs}
        />
      )}

      <div className="flex-1" />

      {/* 볼륨 — 데스크탑(마우스)만 */}
      <div className="hidden items-center gap-1.5 mouse:flex">
        <Button
          variant="ghost-muted"
          size="icon-sm"
          onClick={onToggleMute}
          className="shrink-0 text-white/30 hover:text-white/70"
          aria-label={muted ? '음소거 해제' : '음소거'}
        >
          {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </Button>
        <VolumeSlider value={effectiveVolume} onChange={onVolumeChange} />
      </div>

      {/* 비주얼 모드 순환 — 데스크탑만 */}
      {getAnalyser && (
        <Button
          variant="ghost-muted"
          size="circle-sm"
          onClick={onCycleVisual}
          aria-label="비주얼 모드 변경"
          title={visualMode}
          className="hidden mouse:inline-flex"
        >
          <span className="text-xs">{VISUAL_MODES.find((m) => m.key === visualMode)?.label}</span>
        </Button>
      )}

      {/* 가사 토글 */}
      <Button
        variant="ghost-muted"
        size="circle-sm"
        onClick={onToggleLyrics}
        className={showLyrics ? 'text-sa-accent' : 'text-white/30'}
        aria-label="가사 토글"
      >
        <Type size={14} />
      </Button>
    </div>
  );
}
