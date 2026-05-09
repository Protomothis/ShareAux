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

interface CastButtonProps {
  roomId: string;
  forceShow?: boolean;
  onCastStateChange?: (state: CastState) => void;
  disabled?: boolean;
  track?: CastTrackInfo;
}

// --- 유틸 ---

function updateMediaSession(track?: CastTrackInfo): void {
  if (!('mediaSession' in navigator) || !track) return;
  const artwork =
    track.thumbnail && track.thumbnail !== 'NA' ? [{ src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }] : [];
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.name || 'Unknown',
    artist: track.artist || '',
    album: 'ShareAux',
    artwork,
  });
}

function getRemote(audio: HTMLAudioElement): RemotePlayback | null {
  return (audio as unknown as { remote?: RemotePlayback }).remote ?? null;
}

function hasAirPlay(audio: HTMLAudioElement): boolean {
  return 'webkitShowPlaybackTargetPicker' in audio;
}

function showAirPlayPicker(audio: HTMLAudioElement): void {
  (audio as unknown as { webkitShowPlaybackTargetPicker: () => void }).webkitShowPlaybackTargetPicker();
}

// --- 컴포넌트 ---

export default function CastButton({ roomId, forceShow, onCastStateChange, disabled, track }: CastButtonProps) {
  const t = useTranslations('player');
  const audioRef = useRef<HTMLAudioElement>(null);
  const onCastStateChangeRef = useRef(onCastStateChange);
  onCastStateChangeRef.current = onCastStateChange;

  const [supported, setSupported] = useState(false);
  const [castState, setCastState] = useState<CastState>('disconnected');
  const [loading, setLoading] = useState(false);

  // --- 토큰 prefetch ---
  const tokenRef = useRef<string | null>(null);
  const fetchingRef = useRef(false);

  const prefetchToken = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch(`/api/rooms/${roomId}/stream-token`, { credentials: 'include' });
      if (res.ok) tokenRef.current = ((await res.json()) as { token: string }).token;
    } catch {
      /* 클릭 시 재시도 */
    } finally {
      fetchingRef.current = false;
    }
  }, [roomId]);

  useEffect(() => {
    tokenRef.current = null;
    prefetchToken();
  }, [prefetchToken]);

  // Cast 연결 중 토큰 자동 갱신 (30분 interval, 서버 만료 1시간)
  useEffect(() => {
    if (castState !== 'connected') return;
    const interval = setInterval(prefetchToken, 30 * 60_000);
    return () => clearInterval(interval);
  }, [castState, prefetchToken]);

  // --- Cast 상태 변경 헬퍼 ---
  const updateState = useCallback((state: CastState) => {
    setCastState(state);
    onCastStateChangeRef.current?.(state);
  }, []);

  // iOS 백그라운드 복귀 시 Cast 상태 체크
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const audio = audioRef.current;
      if (!audio || castState !== 'connected') return;
      if (audio.paused && audio.src) {
        audio.play().catch(() => updateState('disconnected'));
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [castState, updateState]);

  // Cast 연결 중 스트림 끊김 감지 (방 종료 등)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || castState !== 'connected') return;
    const onError = () => updateState('disconnected');
    const onEnded = () => updateState('disconnected');
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
    };
  }, [castState, updateState]);

  // --- AirPlay / Remote Playback 이벤트 바인딩 ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Safari AirPlay
    if (hasAirPlay(audio)) {
      setSupported(true);
      const handler = () => {
        const wireless = !!(audio as unknown as { webkitCurrentPlaybackTargetIsWireless?: boolean })
          .webkitCurrentPlaybackTargetIsWireless;
        if (!wireless) audio.pause();
        updateState(wireless ? 'connected' : 'disconnected');
      };
      audio.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', handler);
      return () => audio.removeEventListener('webkitcurrentplaybacktargetiswirelesschanged', handler);
    }

    // Chrome Remote Playback
    const remote = getRemote(audio);
    if (remote) {
      setSupported(true);
      const onConnecting = () => updateState('connecting');
      const onConnect = () => updateState('connected');
      const onDisconnect = () => updateState('disconnected');
      remote.addEventListener('connecting', onConnecting);
      remote.addEventListener('connect', onConnect);
      remote.addEventListener('disconnect', onDisconnect);
      return () => {
        remote.removeEventListener('connecting', onConnecting);
        remote.removeEventListener('connect', onConnect);
        remote.removeEventListener('disconnect', onDisconnect);
      };
    }

    // 기타 브라우저 — 비활성화 속성 없으면 지원 가정
    if (!('disableRemotePlayback' in audio)) setSupported(true);
  }, [updateState]);

  // --- 클릭 핸들러 (동기 — 제스처 컨텍스트 유지) ---
  const handleCast = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 연결 해제
    if (castState === 'connected') {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      updateState('disconnected');
      return;
    }

    // 토큰 미준비 — await 불가 (제스처 만료)
    if (!tokenRef.current) {
      prefetchToken();
      toast.error(t('castRetry'));
      return;
    }

    // src 설정 (동기) — load() 호출 금지: iOS에서 제스처 토큰 소비
    audio.src = getStreamUrl(roomId, tokenRef.current);
    tokenRef.current = null;
    prefetchToken();
    setLoading(true);

    // Chrome: Remote Playback API
    const remote = getRemote(audio);
    if (remote) {
      remote
        .prompt()
        .then(() => updateMediaSession(track))
        .catch((e: DOMException) => {
          if (e.name === 'NotFoundError' || e.name === 'NotAllowedError') toast.error(t('castNoDevice'));
          else if (e.name === 'NotSupportedError') toast.error(t('castNotSupported'));
        })
        .finally(() => setLoading(false));
      return;
    }

    // Safari: play → playing → picker
    const done = () => {
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('error', onError);
      setLoading(false);
    };
    const onPlaying = () => {
      done();
      if (hasAirPlay(audio)) {
        showAirPlayPicker(audio);
        updateState('connected');
        updateMediaSession(track);
      }
    };
    const onError = () => {
      done();
      toast.error(t('castNotSupported'));
    };

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('error', onError);
    audio.play().catch(() => {
      done();
      toast.error(t('castNotSupported'));
    });
  }, [roomId, t, castState, prefetchToken, updateState, track]);

  // --- 렌더 ---
  const isSafari =
    typeof navigator !== 'undefined' && /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);

  const stateClass =
    castState === 'connected'
      ? 'text-sa-accent'
      : castState === 'connecting'
        ? 'animate-pulse text-sa-accent/60'
        : 'text-white/30';

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
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : isSafari ? (
            <Airplay size={14} />
          ) : (
            <Cast size={14} />
          )}
        </Button>
      )}
    </>
  );
}
