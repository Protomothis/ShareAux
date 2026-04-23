'use client';
import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { debug } from '@/lib/debug';

import { useAudio } from './useAudio';

export function useRoomAudio(
  audioLoadingRef: React.MutableRefObject<boolean>,
  setAudioLoading: (v: boolean) => void,
  onTimeUpdate?: (ms: number) => void,
) {
  const tRoom = useTranslations('room');
  const audio = useAudio(
    () => {
      if (audioLoadingRef.current) {
        debug('[roomAudio] audio ready, clearing loading state');
        audioLoadingRef.current = false;
        setAudioLoading(false);
      }
    },
    () => {
      debug('[roomAudio] MSE error — stopping listening');
      listeningRef.current = false;
      setListening(false);
    },
    onTimeUpdate,
  );

  const [listening, setListening] = useState(false);
  const listeningRef = useRef(false);
  const [audioReady, setAudioReady] = useState(false);
  const [volume, setVolumeState] = useState(1);

  const frameCountRef = useRef(0);
  const lastLogRef = useRef(0);

  const onAudio = useCallback(
    (frame: Uint8Array) => {
      if (!listeningRef.current) return;
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

  const handleListenToggle = useCallback(
    async (sendListening: (v: boolean) => void) => {
      debug('[roomAudio] toggle listening:', listening, '→', !listening);
      if (!listening) {
        if (!audio.supported) {
          toast.error(tRoom('mseNotSupported'));
          return;
        }
        setAudioLoading(true);
        audioLoadingRef.current = true;
        listeningRef.current = true;
        await audio.init();
        setAudioReady(true);
        setListening(true);
        sendListening(true);
      } else {
        audio.pause();
        setListening(false);
        listeningRef.current = false;
        sendListening(false);
      }
    },
    [audio, listening, audioLoadingRef, setAudioLoading],
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
    listening,
    audioReady,
    volume,
    onAudio,
    handleListenToggle,
    handleVolumeChange,
    /** MSE 버퍼 확보 대기 중 여부 */
    buffering: audio.buffering,
  };
}
