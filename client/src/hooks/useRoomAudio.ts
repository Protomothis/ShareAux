'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { debug } from '@/lib/debug';

import { useAudio } from './useAudio';

export function useRoomAudio(
  audioLoadingRef: React.MutableRefObject<boolean>,
  setAudioLoading: (v: boolean) => void,
  onStall?: () => void,
) {
  const onStallRef = useRef(onStall);
  useEffect(() => {
    onStallRef.current = onStall;
  }, [onStall]);

  const audio = useAudio(
    () => {
      if (audioLoadingRef.current) {
        debug('[roomAudio] audio ready, clearing loading state');
        audioLoadingRef.current = false;
        setAudioLoading(false);
      }
    },
    () => onStallRef.current?.(),
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
    async (sendListening: (v: boolean) => void, sendResync?: () => void) => {
      debug('[roomAudio] toggle listening:', listening, '→', !listening);
      if (!listening) {
        if (!audio.supported) {
          toast.error('이 브라우저에서는 실시간 오디오를 지원하지 않습니다');
          return;
        }
        setAudioLoading(true);
        audioLoadingRef.current = true;
        listeningRef.current = true;
        await audio.init();
        setAudioReady(true);
        setListening(true);
        sendListening(true);
        // clearBuffer 완료 후 다음 마이크로태스크에서 resync
        void audio.prepareResync().then(() => sendResync?.());
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
  };
}
