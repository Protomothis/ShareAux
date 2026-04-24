'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { SystemChatEvent } from '@/api/model';
import type { RoomQueue, Track, TrackLyricsType } from '@/api/model';
import { roomsControllerFindOne } from '@/api/rooms/rooms';
import { useInvalidate } from '@/hooks/useQueries';
import { debug } from '@/lib/debug';
import type { AutoDjStatus, ChatMessage, StreamState, TrackVoteMap } from '@/types';
import { LyricsStatus, WsEvent } from '@/types';

interface TrackState {
  track: Track;
  elapsedMs: number;
}

export function useRoomEvents(
  roomId: string,
  listeningRef: React.MutableRefObject<boolean>,
  _trackRef: React.MutableRefObject<Track | null>,
  getOneWayRef?: React.MutableRefObject<() => number>,
  onResyncNeededRef?: React.MutableRefObject<(action: 'prepare' | 'send') => void>,
) {
  const router = useRouter();
  const invalidate = useInvalidate();
  const t = useTranslations('room');
  const goneRef = useRef(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPlaying, setPlaying] = useState(false);
  const [lyricsStatus, setLyricsStatus] = useState(LyricsStatus.Searching);
  const [lyricsType, setLyricsType] = useState<TrackLyricsType>(null);
  const [lyricsVersion, setLyricsVersion] = useState(0);
  const [skipVotes, setSkipVotes] = useState(0);
  const [autoDjStatus, setAutoDjStatus] = useState<AutoDjStatus>('idle');
  const [skipRequired, setSkipRequired] = useState(1);
  const [listenerCount, setListenerCount] = useState(0);
  const [trackVotes, setTrackVotes] = useState<TrackVoteMap>(new Map());
  const [currentTrackState, setTrack] = useState<Track | null>(null);
  const [timeSync, setTimeSync] = useState({ base: 0, at: 0 });

  const audioLoadingRef = useRef(false);
  const pendingTrackRef = useRef<TrackState | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [streamState, setStreamState] = useState<StreamState>('idle');
  const [mutedUntil, setMutedUntil] = useState(0);

  const onChat = useCallback((data: ChatMessage) => {
    setMessages((prev) => prev.slice(-200).concat({ ...data, type: 'chat' }));
  }, []);

  // ─── Navigation events (kick, close, duplicate) ───────
  const handleNavigation = useCallback(
    (event: string, detail: string) => {
      if (goneRef.current) return true;
      const nav: Partial<Record<WsEvent, { msg: string; level: 'info' | 'error' }>> = {
        [WsEvent.roomClosed]: { msg: t('nav.roomClosed'), level: 'info' },
        [WsEvent.userKicked]: { msg: t('nav.kicked'), level: 'error' },
        [WsEvent.duplicateSession]: { msg: t('nav.duplicateSession'), level: 'info' },
        [WsEvent.joinedOtherRoom]: { msg: '', level: 'info' },
      };
      const entry = nav[event as WsEvent];
      if (!entry) return false;
      goneRef.current = true;
      if (entry.msg) toast[entry.level](entry.msg);
      router.push('/rooms');
      return true;
    },
    [router],
  );

  // ─── Playback: streamState-only update ────────────────
  const handleStreamStateOnly = useCallback(
    (ss: string) => {
      if ((ss === 'preparing' || ss === 'skipping') && listeningRef.current) {
        audioLoadingRef.current = true;
        setAudioLoading(true);
      }
      if (ss === 'skipping' || ss === 'preparing') {
        setStreamState(ss as StreamState);
        setTimeSync({ base: 0, at: 0 });
        if (listeningRef.current) onResyncNeededRef?.current('prepare');
      }
      if (ss === 'streaming') {
        setStreamState('streaming');
        // streaming: 서버에 init segment 확보됨 → resync 요청
        if (listeningRef.current) onResyncNeededRef?.current('send');
      }
    },
    [listeningRef, onResyncNeededRef],
  );

  // ─── Playback: track change (lyrics/skip reset) ──────
  const handleTrackChange = useCallback(
    (track: Track | undefined) => {
      const ls = track?.lyricsStatus;
      setLyricsStatus(
        ls === 'found' ? LyricsStatus.Found : ls === 'not_found' ? LyricsStatus.NotFound : LyricsStatus.Searching,
      );
      setLyricsType(null);
      setSkipVotes(0);
      setStreamState('preparing');
      if (listeningRef.current) onResyncNeededRef?.current('prepare');
    },
    [listeningRef, onResyncNeededRef],
  );

  // ─── Playback: time sync ──────────────────────────────
  const handleTimeSync = useCallback(
    (d: { elapsedMs?: number; streamState?: string }, trackChanged: boolean) => {
      const ow = getOneWayRef?.current() ?? 0;
      if (trackChanged || d.streamState === 'streaming') {
        setTimeSync({ base: (d.elapsedMs ?? 0) + ow, at: Date.now() });
      } else if (d.elapsedMs != null) {
        // 같은 곡: drift 2초 이상이면 보정
        setTimeSync((prev) => {
          const clientElapsed = prev.base + (Date.now() - prev.at);
          const corrected = d.elapsedMs! + ow;
          return Math.abs(clientElapsed - corrected) > 2000 ? { base: corrected, at: Date.now() } : prev;
        });
      }
    },
    [getOneWayRef],
  );

  // ─── Playback: stopped ────────────────────────────────
  const handleStopped = useCallback(() => {
    setTrack(null);
    setTimeSync({ base: 0, at: 0 });
    setStreamState('idle');
  }, []);

  // ─── Playback: main handler ───────────────────────────
  const handlePlayback = useCallback(
    (d: { track?: Track; elapsedMs?: number; isPlaying?: boolean; streamState?: string }) => {
      debug('[page] playback_updated', d.track?.name, 'state:', d.streamState);

      // streamState만 온 경우
      if (d.streamState && d.isPlaying === undefined) {
        handleStreamStateOnly(d.streamState);
        return;
      }

      const trackChanged = d.track?.id !== _trackRef.current?.id;

      if (trackChanged) {
        _trackRef.current = d.track ?? null;
        handleTrackChange(d.track);
      } else if (d.track?.lyricsStatus === 'found') {
        setLyricsStatus(LyricsStatus.Found);
      }

      if (d.isPlaying) {
        setTrack(d.track ?? null);
        handleTimeSync(d, trackChanged);
        if (listeningRef.current && d.streamState === 'preparing') {
          audioLoadingRef.current = true;
          setAudioLoading(true);
        }
        if (d.streamState) setStreamState(d.streamState as StreamState);
        // streaming 전환: init segment 확보됨 → resync 요청
        if (d.streamState === 'streaming' && listeningRef.current) {
          onResyncNeededRef?.current('send');
        }
      } else {
        handleStopped();
      }
      setPlaying(!!d.isPlaying);
    },
    [
      _trackRef,
      listeningRef,
      onResyncNeededRef,
      handleStreamStateOnly,
      handleTrackChange,
      handleTimeSync,
      handleStopped,
    ],
  );

  // ─── System event dispatcher ──────────────────────────
  const onSystem = useCallback(
    (data: { event: string; detail: string; data?: Record<string, unknown> }) => {
      // 채팅 제한
      if (data.event === WsEvent.chatMuted) {
        const seconds = parseInt(data.detail, 10) || 30;
        setMutedUntil(Date.now() + seconds * 1000);
        toast.error(t('chatMuted', { seconds }));
        return;
      }

      // 네비게이션 (kick, close, duplicate 등)
      if (handleNavigation(data.event, data.detail)) return;

      // 권한 변경
      if (data.event === WsEvent.permissionChanged) {
        const key = data.detail === 'djTransferred' ? 'djTransferred' : 'permissionChanged';
        toast.info(t(`nav.${key}` as 'nav.djTransferred' | 'nav.permissionChanged'));
        invalidate.permissions(roomId);
        return;
      }

      // 재생 상태
      if (data.event === WsEvent.playbackUpdated && data.data) {
        handlePlayback(data.data as { track?: Track; elapsedMs?: number; isPlaying?: boolean; streamState?: string });
        return;
      }

      // 가사
      if (data.event === WsEvent.lyricsResult && data.data) {
        const { status, lyricsType } = data.data as { status: LyricsStatus; lyricsType?: TrackLyricsType };
        setLyricsStatus(status);
        setLyricsType(lyricsType ?? null);
        return;
      }
      if (data.event === WsEvent.lyricsUpdated && data.data) {
        const { trackId } = data.data as { trackId: string };
        if (trackId === _trackRef.current?.id) setLyricsVersion((v) => v + 1);
        return;
      }

      // 메타데이터 갱신
      if (data.event === WsEvent.metadataUpdated && data.data) {
        const d = data.data as { artist?: string; title?: string };
        setTrack((prev: Track | null) =>
          prev ? { ...prev, artist: d.artist ?? prev.artist, name: d.title ?? prev.name } : prev,
        );
        return;
      }

      // 큐/AutoDJ
      if (data.event === WsEvent.queueUpdated) {
        const d = data.data as { queue?: RoomQueue[] } | undefined;
        if (d?.queue) {
          invalidate.setQueue(roomId, d.queue);
        } else {
          invalidate.queue(roomId);
        }
        invalidate.history(roomId);
        return;
      }
      if (data.event === WsEvent.autoDjStatus && data.data) {
        setAutoDjStatus((data.data as { status: AutoDjStatus }).status);
        return;
      }

      // 채팅 히스토리
      if (data.event === WsEvent.chatHistory && data.data?.messages) {
        setMessages((data.data as { messages: ChatMessage[] }).messages.map((m) => ({ ...m, type: 'chat' as const })));
        return;
      }

      // 방 멤버/설정 변경
      if (
        data.event === WsEvent.userJoined ||
        data.event === WsEvent.userLeft ||
        data.event === WsEvent.hostChanged ||
        data.event === WsEvent.roomUpdated ||
        data.event === WsEvent.userKicked
      ) {
        if (!goneRef.current) {
          invalidate.room(roomId);
          invalidate.quota(roomId);
          if (data.event === WsEvent.hostChanged) invalidate.permissions(roomId);
        }
      }

      // 투표
      if (data.event === WsEvent.voteUpdated && data.data) {
        const d = data.data as { currentVotes: number; required: number };
        setSkipVotes(d.currentVotes);
        setSkipRequired(d.required);
        return;
      }
      if (data.event === WsEvent.trackVote && data.data) {
        const { trackId, likes, dislikes } = data.data as { trackId: string; likes: number; dislikes: number };
        setTrackVotes((prev) => new Map(prev).set(trackId, { likes, dislikes }));
        return;
      }

      // 리스너 수
      if (data.event === WsEvent.listenerCount && data.data) {
        setListenerCount((data.data as { count: number }).count);
        return;
      }

      // 기타 시스템 메시지 → 채팅에 표시
      const CHAT_EVENTS = new Set<string>(Object.values(SystemChatEvent));
      if (!CHAT_EVENTS.has(data.event)) return;
      setMessages((prev) =>
        prev.slice(-200).concat({
          userId: '',
          nickname: (data.data as { nickname?: string })?.nickname ?? '',
          message: data.event,
          timestamp: new Date().toISOString(),
          type: 'system',
          data: data.data as { nickname?: string; trackName?: string; count?: number } | undefined,
        }),
      );
    },
    [router, roomId, invalidate, listeningRef, _trackRef, handleNavigation, handlePlayback],
  );

  const applyPendingTrack = useCallback((): boolean => {
    return false;
  }, []);

  const markGone = useCallback(() => {
    goneRef.current = true;
  }, []);

  // 모바일 백그라운드 복귀 시 방 유효성 체크
  useEffect(() => {
    const onVisibility = async () => {
      if (document.visibilityState !== 'visible' || goneRef.current) return;
      try {
        await roomsControllerFindOne(roomId);
      } catch {
        goneRef.current = true;
        toast.error(t('roomGone'));
        router.push('/rooms');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [roomId, router]);

  // listening 중 audio.currentTime → timeSync 갱신은 useAudio의 onTimeUpdate 콜백으로 처리

  return {
    messages,
    setMessages,
    isPlaying,
    setPlaying,
    lyricsStatus,
    setLyricsStatus,
    lyricsType,
    lyricsVersion,
    skipVotes,
    skipRequired,
    listenerCount,
    trackVotes,
    currentTrack: currentTrackState,
    setTrack,
    elapsedBase: timeSync.base,
    syncTime: timeSync.at,
    setTimeSync,
    audioLoading,
    setAudioLoading,
    audioLoadingRef,
    pendingTrackRef,
    applyPendingTrack,
    onChat,
    onSystem,
    goneRef,
    autoDjStatus,
    streamState,
    setStreamState,
    markGone,
    mutedUntil,
  };
}
