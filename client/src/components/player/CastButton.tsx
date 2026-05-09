'use client';

import { Airplay, Cast, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { getStreamUrl } from '@/lib/urls';

export type CastState = 'disconnected' | 'connecting' | 'connected';

interface CastTrackInfo {
  name?: string | null;
  artist?: string | null;
  thumbnail?: string | null;
}

function updateMediaSession(track?: CastTrackInfo): void {
  if (!('mediaSession' in navigator) || !track) return;
  const artwork = track.thumbnail && track.thumbnail !== 'NA'
    ? [{ src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
    : [];
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.name || 'Unknown',
    artist: track.artist || '',
    album: 'ShareAux',
    artwork,
  });
}

interface CastButtonProps {
  roomId: string;
  forceShow?: boolean;
  onCastStateChange?: (state: CastState) => void;
  disabled?: boolean;
  track?: CastTrackInfo;
}

export default function CastButton({ roomId, forceShow, onCastStateChange, disabled, track }: CastButtonProps) {
  const t = useTranslations('player');
  const audioRef = useRef<HTMLAudioElement>(null);
  const onCastStateChangeRef = useRef(onCastStateChange);
  onCastStateChangeRef.current = onCastStateChange;

  const [supported, setSupported] = useState(false);
  const [castState, setCastState] = useState<CastState>('disconnected');
  const [loading, setLoading] = useState(false);

  // AirPlay/Remote Playback 상태 감지
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if ('webkitShowPlaybackTargetPicker' in audio) {
      setSupported(true);
      const onWirelessChanged = () => {
        const isWireless = (audio as unknown as { webkitCurrentPlaybackTargetIsWireless?: boolean }).webkitCurrentPlaybackTargetIsWireless;
        const state: CastState = isWireless ? 'connected' : 'disconnected';
        if (!isWireless) audio.pause();
        setCastState(state);
        onCastStateChangeRef.current?.(state);
      };
      audio.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', onWirelessChanged);
      return () => { audio.removeEventListener('webkitcurrentplaybacktargetiswirelesschanged', onWirelessChanged); };
    }

    if ('remote' in audio) {
      setSupported(true);
      const remote = (audio as HTMLAudioElement & { remote: RemotePlayback }).remote;
      const onConnect = () => { setCastState('connected'); onCastStateChangeRef.current?.('connected'); };
      const onDisconnect = () => { setCastState('disconnected'); onCastStateChangeRef.current?.('disconnected'); };
      const onConnecting = () => { setCastState('connecting'); onCastStateChangeRef.current?.('connecting'); };
      remote.addEventListener('connecting', onConnecting);
      remote.addEventListener('connect', onConnect);
      remote.addEventListener('disconnect', onDisconnect);
      return () => {
        remote.removeEventListener('connecting', onConnecting);
        remote.removeEventListener('connect', onConnect);
        remote.removeEventListener('disconnect', onDisconnect);
      };
    }

    if (!('disableRemotePlayback' in audio)) setSupported(true);
  }, []);

  const handleCast = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    // 이미 연결 중이면 해제
    if (castState === 'connected') {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      setCastState('disconnected');
      onCastStateChangeRef.current?.('disconnected');
      return;
    }

    setLoading(true);

    // stream token 발급
    let streamToken: string;
    try {
      const res = await fetch(`/api/rooms/${roomId}/stream-token`, { credentials: 'include' });
      if (!res.ok) { toast.error(t('castNotSupported')); setLoading(false); return; }
      const data = (await res.json()) as { token: string };
      streamToken = data.token;
    } catch {
      toast.error(t('castNotSupported'));
      setLoading(false);
      return;
    }

    const url = getStreamUrl(roomId, streamToken);
    audio.src = url;
    audio.load();

    // Chrome: Remote Playback API — play 없이 바로 prompt
    if ('remote' in audio) {
      setLoading(false);
      (audio as HTMLAudioElement & { remote: RemotePlayback }).remote.prompt().catch((e: DOMException) => {
        if (e.name === 'NotFoundError' || e.name === 'NotAllowedError') toast.error(t('castNoDevice'));
        else if (e.name === 'NotSupportedError') toast.error(t('castNotSupported'));
      });
      updateMediaSession(track);
      return;
    }

    // Safari: play 필요 → playing 이벤트 후 picker
    const el = audioRef.current!;
    const onPlaying = () => {
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('error', onError);
      setLoading(false);

      if ('webkitShowPlaybackTargetPicker' in el) {
        (el as HTMLAudioElement & { webkitShowPlaybackTargetPicker: () => void }).webkitShowPlaybackTargetPicker();
        setCastState('connected');
        onCastStateChangeRef.current?.('connected');
        updateMediaSession(track);
      }
    };

    const onError = () => {
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('error', onError);
      setLoading(false);
      toast.error(t('castNotSupported'));
    };

    el.addEventListener('playing', onPlaying);
    el.addEventListener('error', onError);
    el.play().catch(() => {
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('error', onError);
      setLoading(false);
      toast.error(t('castNotSupported'));
    });
  }, [roomId, t, castState]);

  const isSafari = typeof navigator !== 'undefined' && /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);

  const stateClass =
    castState === 'connected' ? 'text-sa-accent' :
    castState === 'connecting' ? 'animate-pulse text-sa-accent/60' :
    'text-white/30';

  return (
    <>
      <audio ref={audioRef} preload="none" className="hidden" />
      {(supported || forceShow) && (
        <Button
          variant="ghost-muted"
          size="circle-sm"
          onClick={handleCast}
          disabled={disabled || loading}
          className={stateClass}
          aria-label={t('cast')}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> :
           isSafari ? <Airplay size={14} /> : <Cast size={14} />}
        </Button>
      )}
    </>
  );
}
