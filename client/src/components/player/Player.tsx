'use client';

import { useState } from 'react';

import { useAudioControl } from '@/hooks/useAudioControl';
import type { AutoDjStatus, StreamState, TrackInfo, TrackVoteMap, VisualMode } from '@/types';
import { LyricsStatus } from '@/types';

import Lyrics from './Lyrics';
import PlayerControls from './PlayerControls';
import PlayerInfo from './PlayerInfo';
import PlayerProgress from './PlayerProgress';
import Visualizer, { VISUAL_MODES } from './Visualizer';

interface PlayerProps {
  roomId: string;
  isHost: boolean;
  canVoteSkip?: boolean;
  track: TrackInfo | null;
  onVolumeChange: (volume: number) => void;
  onListenToggle: () => void;
  listening: boolean;
  audioLoading?: boolean;
  volume: number;
  skipVotes: number;
  skipRequired: number;
  elapsedBase?: number;
  syncTime?: number;
  isPlaying?: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  getAnalyser?: () => AnalyserNode | null;
  getDelay?: () => number;
  streamCodec?: string;
  streamBitrate?: number;
  lyricsStatus?: LyricsStatus;
  lyricsEnhanced?: boolean;
  lyricsVersion?: number;
  trackVotes?: TrackVoteMap;
  autoDjEnabled?: boolean;
  autoDjStatus?: AutoDjStatus;
  streamState?: StreamState;
  onSkipError?: () => void;
}

export default function Player({
  roomId,
  isHost,
  canVoteSkip = true,
  track,
  onVolumeChange,
  onListenToggle,
  listening,
  audioLoading,
  volume,
  skipVotes,
  skipRequired,
  elapsedBase = 0,
  syncTime = 0,
  isPlaying,
  hasNext,
  hasPrev,
  getAnalyser,
  getDelay,
  streamCodec,
  streamBitrate,
  lyricsStatus,
  lyricsEnhanced,
  lyricsVersion,
  trackVotes,
  autoDjEnabled,
  autoDjStatus,
  streamState,
  onSkipError,
}: PlayerProps) {
  const { elapsed, muted, effectiveVolume, toggleMute, handleVolumeChange } = useAudioControl({
    elapsedBase,
    syncTime,
    isPlaying,
    volume,
    onVolumeChange,
  });
  const [visualMode, setVisualMode] = useState<VisualMode>('bars');
  const [showLyrics, setShowLyrics] = useState(true);
  const duration = track?.durationMs ?? 0;
  const isStreaming = streamState === 'streaming';
  const displayElapsed = isStreaming ? elapsed : 0;
  const progress = duration > 0 && isStreaming ? Math.min(elapsed / duration, 1) : 0;

  return (
    <div className="animate-fade-in relative overflow-x-clip bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-2xl lg:mx-0 lg:mt-0 lg:rounded-2xl lg:border lg:border-white/[0.08]">
      {/* 썸네일 블러 배경 */}
      {track?.thumbnail && track.thumbnail !== 'NA' && (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.08] blur-2xl saturate-150"
          style={{ backgroundImage: `url(${track.thumbnail})` }}
        />
      )}
      <PlayerInfo
        track={track}
        isPlaying={isPlaying}
        isHost={isHost}
        roomId={roomId}
        streamCodec={streamCodec}
        streamBitrate={streamBitrate}
        lyricsStatus={lyricsStatus}
        lyricsEnhanced={lyricsEnhanced}
        trackVotes={trackVotes}
        autoDjEnabled={autoDjEnabled}
        autoDjStatus={autoDjStatus}
        streamState={streamState}
      />

      {getAnalyser && (
        <div className="mx-4 mb-1 hidden overflow-hidden rounded-lg bg-white/[0.03] p-2 mouse:block">
          <Visualizer getAnalyser={getAnalyser} active={!!listening && !!isPlaying} mode={visualMode} />
        </div>
      )}

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${showLyrics && isStreaming ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <Lyrics
          roomId={roomId}
          elapsed={elapsed}
          elapsedBase={elapsedBase}
          syncTime={syncTime}
          lyricsStatus={lyricsStatus ?? LyricsStatus.Searching}
          trackId={track?.id}
          lyricsVersion={lyricsVersion}
        />
      </div>

      {!!track && (
        <PlayerProgress elapsed={displayElapsed} duration={duration} progress={progress} showTime={isStreaming} />
      )}

      <PlayerControls
        roomId={roomId}
        isHost={isHost}
        canVoteSkip={canVoteSkip}
        listening={listening}
        audioLoading={audioLoading}
        volume={volume}
        muted={muted}
        effectiveVolume={effectiveVolume}
        onVolumeChange={handleVolumeChange}
        onToggleMute={toggleMute}
        onListenToggle={onListenToggle}
        skipVotes={skipVotes}
        skipRequired={skipRequired}
        trackName={track?.name}
        hasNext={hasNext}
        hasPrev={hasPrev}
        elapsedMs={elapsed}
        getAnalyser={getAnalyser}
        showLyrics={showLyrics}
        onToggleLyrics={() => setShowLyrics((v) => !v)}
        visualMode={visualMode}
        onCycleVisual={() =>
          setVisualMode((v) => {
            const i = VISUAL_MODES.findIndex((m) => m.key === v);
            return VISUAL_MODES[(i + 1) % VISUAL_MODES.length].key;
          })
        }
        streamState={streamState}
        onSkipError={onSkipError}
      />
    </div>
  );
}
