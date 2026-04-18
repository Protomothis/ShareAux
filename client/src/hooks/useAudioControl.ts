import { useEffect, useState } from 'react';

interface UseAudioControlOptions {
  elapsedBase: number;
  syncTime: number;
  isPlaying?: boolean;
  volume: number;
  onVolumeChange: (v: number) => void;
}

export function useAudioControl({ elapsedBase, syncTime, isPlaying, volume, onVolumeChange }: UseAudioControlOptions) {
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);

  useEffect(() => {
    if (!isPlaying || !syncTime) {
      setElapsed(0);
      return;
    }
    // elapsedBase/syncTime 변경 시 즉시 반영 (interval 기다리지 않음)
    const now = Math.max(0, elapsedBase + (Date.now() - syncTime));
    setElapsed(now);
    const tick = () => setElapsed(Math.max(0, elapsedBase + (Date.now() - syncTime)));
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [elapsedBase, syncTime, isPlaying]);

  const displayElapsed = isPlaying ? elapsed : 0;

  const toggleMute = () => {
    if (muted) {
      onVolumeChange(prevVolume);
      setMuted(false);
    } else {
      setPrevVolume(volume);
      onVolumeChange(0);
      setMuted(true);
    }
  };

  const handleVolumeChange = (v: number) => {
    onVolumeChange(v);
    if (v > 0) setMuted(false);
  };

  const effectiveVolume = muted ? 0 : volume;

  return { elapsed: displayElapsed, muted, effectiveVolume, toggleMute, handleVolumeChange };
}
