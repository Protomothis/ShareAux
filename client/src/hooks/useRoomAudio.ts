'use client';
import { useCallback, useRef, useState } from 'react';

import { debug } from '@/lib/debug';

import { useAudio } from './useAudio';

/**
 * useRoomAudio — 순수 오디오 재생 관리
 * listening 상태는 useRoomSync가 관리. 여기서는 init/pause/pushFrame/volume만.
 */
export function useRoomAudio(
  audioLoadingRef: React.MutableRefObject<boolean>,
  setAudioLoading: (v: boolean) => void,
  onTimeUpdate?: (ms: number) => void,
  onError?: () => void,
) {
  const audio = useAudio(
    () => {
      if (audioLoadingRef.current) {
        debug('[roomAudio] audio ready, clearing loading state');
        audioLoadingRef.current = false;
        setAudioLoading(false);
      }
    },
    () => {
      debug('[roomAudio] MSE error');
      onError?.();
    },
    onTimeUpdate,
  );

  const [volume, setVolumeState] = useState(1);
  const frameCountRef = useRef(0);
  const lastLogRef = useRef(0);

  /** 오디오 프레임 수신 — listeningRef 체크는 호출자가 담당 */
  const onAudio = useCallback(
    (frame: Uint8Array) => {
      frameCountRef.current++;
      const now = Date.now();
      if (now - lastLogRef.current >= 15_000) {
        debug('[audio] frames received:', frameCountRef.current, 'size:', frame.length);
        frameCountRef.current = 0;
        lastLogRef.current = now;
      }
      audio.pushFrame(frame);
    },
    [audio],
  );

  const handleVolumeChange = useCallback(
    (v: number) => {
      audio.setVolume(v);
      setVolumeState(v);
    },
    [audio],
  );

  return {
    audio,
    volume,
    onAudio,
    handleVolumeChange,
    buffering: audio.buffering,
  };
}
