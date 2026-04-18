'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { Track } from '@/api/model';
import { useInvalidate } from '@/hooks/useQueries';
import { debug } from '@/lib/debug';
import type { AutoDjStatus, ChatMessage, StreamState, TrackVoteMap } from '@/types';
import { LyricsStatus, WsEvent } from '@/types';

interface TrackState {
  track: Track;
  elapsedMs: number;
}

/** 서버 track 객체에서 lyricsStatus 파싱 */
function parseLyricsStatus(track: Track | undefined): LyricsStatus {
  const ls = (track as Record<string, unknown> | undefined)?.lyricsStatus as string | undefined;
  if (ls === 'found') return LyricsStatus.Found;
  if (ls === 'not_found') return LyricsStatus.NotFound;
  return LyricsStatus.Searching;
}

export function useRoomEvents(
  roomId: string,
  listeningRef: React.MutableRefObject<boolean>,
  _trackRef: React.MutableRefObject<Track | null>,
  getOneWayRef?: React.MutableRefObject<() => number>,
  getCurrentTimeRef?: React.MutableRefObject<() => number>,
) {
  const router = useRouter();
  const invalidate = useInvalidate();
  const goneRef = useRef(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPlaying, setPlaying] = useState(false);
  const [lyricsStatus, setLyricsStatus] = useState(LyricsStatus.Searching);
  const [lyricsEnhanced, setLyricsEnhanced] = useState(false);
  const [lyricsVersion, setLyricsVersion] = useState(0);
  const [skipVotes, setSkipVotes] = useState(0);
  const [autoDjStatus, setAutoDjStatus] = useState<AutoDjStatus>('idle');
  const [skipRequired, setSkipRequired] = useState(1);
  const [listenerCount, setListenerCount] = useState(0);
  const [trackVotes, setTrackVotes] = useState<TrackVoteMap>(new Map());
  const [currentTrackState, setTrack] = useState<Track | null>(null);
  const [elapsedBase, setElapsedBase] = useState(0);
  const [syncTime, setSyncTime] = useState(0);

  const audioLoadingRef = useRef(false);
  const pendingTrackRef = useRef<TrackState | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [streamState, setStreamState] = useState<StreamState>('idle');
  const [mutedUntil, setMutedUntil] = useState(0);

  const onChat = useCallback((data: ChatMessage) => {
    setMessages((prev) => prev.slice(-200).concat({ ...data, type: 'chat' }));
  }, []);

  const onSystem = useCallback(
    (data: { event: string; detail: string; data?: Record<string, unknown> }) => {
      if (data.event === 'chatMuted') {
        const seconds = parseInt(data.detail.match(/\d+/)?.[0] ?? '30', 10);
        setMutedUntil(Date.now() + seconds * 1000);
        toast.error(data.detail);
        return;
      }
      if (data.event === WsEvent.roomClosed) {
        if (goneRef.current) return;
        goneRef.current = true;
        toast.info('방이 종료되었습니다');
        router.push('/rooms');
        return;
      }
      if (data.event === 'kicked') {
        if (goneRef.current) return;
        goneRef.current = true;
        toast.error('방에서 추방되었습니다');
        router.push('/rooms');
        return;
      }
      if (data.event === 'duplicateSession') {
        if (goneRef.current) return;
        goneRef.current = true;
        toast.info('다른 기기에서 접속하여 연결이 종료되었습니다');
        router.push('/rooms');
        return;
      }
      if (data.event === 'joinedOtherRoom') {
        if (goneRef.current) return;
        goneRef.current = true;
        router.push('/rooms');
        return;
      }
      if (data.event === WsEvent.permissionChanged) {
        toast.info(data.detail);
        invalidate.permissions(roomId);
        return;
      }
      if (data.event === WsEvent.playbackUpdated && data.data) {
        const d = data.data as { track?: Track; elapsedMs?: number; isPlaying?: boolean; streamState?: string };
        debug('[page] playback_updated', d.track?.name, 'state:', d.streamState);

        // streamState만 온 경우 (skip/previous preparing 등)
        if (d.streamState && d.isPlaying === undefined) {
          if ((d.streamState === 'preparing' || d.streamState === 'skipping') && listeningRef.current) {
            audioLoadingRef.current = true;
            setAudioLoading(true);
          }
          if (d.streamState === 'skipping') setStreamState('skipping');
          return;
        }

        const trackChanged = d.track?.id !== _trackRef.current?.id;

        const trackLyricsStatus = d.track?.lyricsStatus;

        // 곡 변경 시 가사/스킵 리셋
        if (trackChanged) {
          setLyricsStatus(
            trackLyricsStatus === 'found'
              ? LyricsStatus.Found
              : trackLyricsStatus === 'not_found'
                ? LyricsStatus.NotFound
                : LyricsStatus.Searching,
          );
          setLyricsEnhanced(false);
          setSkipVotes(0);
          setStreamState('preparing');
        } else if (trackLyricsStatus === 'found') {
          // 같은 곡이지만 가사가 이미 found면 반영 (중간 입장자)
          setLyricsStatus(LyricsStatus.Found);
        }

        if (d.isPlaying) {
          setTrack(d.track ?? null);
          const ow = getOneWayRef?.current() ?? 0;
          if (trackChanged) {
            // 곡 변경: 무조건 리셋 (oneWay 보정: 이벤트는 ow ms 전에 발생)
            setElapsedBase((d.elapsedMs ?? 0) + ow);
            setSyncTime(Date.now());
          } else if (d.elapsedMs != null) {
            // 같은 곡: drift 2초 이상이면 보정
            setElapsedBase((prevBase) => {
              setSyncTime((prevSync) => {
                const clientElapsed = prevBase + (Date.now() - prevSync);
                return Math.abs(clientElapsed - d.elapsedMs!) > 2000 ? Date.now() : prevSync;
              });
              const corrected = d.elapsedMs! + ow;
              return Math.abs(corrected - prevBase) > 2000 ? corrected : prevBase;
            });
          }
          if (listeningRef.current && d.streamState === 'preparing') {
            audioLoadingRef.current = true;
            setAudioLoading(true);
          }
          if (d.streamState) setStreamState(d.streamState as StreamState);
        } else {
          setTrack(null);
          setElapsedBase(0);
          setSyncTime(0);
        }
        setPlaying(!!d.isPlaying);
        return;
      }
      if (data.event === WsEvent.lyricsResult && data.data) {
        const { status, enhanced } = data.data as { status: LyricsStatus; enhanced?: boolean };
        setLyricsStatus(status);
        setLyricsEnhanced(!!enhanced);
        return;
      }
      if (data.event === WsEvent.lyricsUpdated && data.data) {
        const { trackId } = data.data as { trackId: string };
        if (trackId === _trackRef.current?.id) {
          setLyricsVersion((v) => v + 1);
        }
        return;
      }
      if (data.event === WsEvent.metadataUpdated && data.data) {
        const d = data.data as { artist?: string; title?: string };
        setTrack((prev: Track | null) =>
          prev ? { ...prev, artist: d.artist ?? prev.artist, name: d.title ?? prev.name } : prev,
        );
        return;
      }
      if (data.event === WsEvent.queueUpdated) {
        invalidate.queue(roomId);
        invalidate.history(roomId);
        return;
      }
      if (data.event === WsEvent.autoDjStatus && data.data) {
        const d = data.data as { status: AutoDjStatus };
        setAutoDjStatus(d.status);
        return;
      }
      if (data.event === WsEvent.chatHistory && data.data?.messages) {
        const d = data.data as { messages: ChatMessage[] };
        setMessages(d.messages.map((m) => ({ ...m, type: 'chat' as const })));
        return;
      }
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
      if (data.event === WsEvent.listenerCount && data.data) {
        setListenerCount((data.data as { count: number }).count);
        return;
      }
      if (!data.detail) return;
      setMessages((prev) =>
        prev.slice(-200).concat({
          userId: '',
          nickname: '',
          message: data.detail || data.event,
          timestamp: new Date().toISOString(),
          type: 'system',
        }),
      );
    },
    [router, roomId, invalidate, listeningRef],
  );

  const applyPendingTrack = useCallback((): boolean => {
    return false;
  }, []);

  const markGone = useCallback(() => {
    goneRef.current = true;
  }, []);

  // listening 중일 때 audio.currentTime 기반으로 elapsedBase 갱신
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      if (!listeningRef.current || !getCurrentTimeRef?.current) return;
      const audioMs = getCurrentTimeRef.current();
      if (audioMs > 0) {
        setElapsedBase(audioMs);
        setSyncTime(Date.now());
      }
    }, 250);
    return () => clearInterval(id);
  }, [isPlaying, listeningRef, getCurrentTimeRef]);

  return {
    messages,
    setMessages,
    isPlaying,
    setPlaying,
    lyricsStatus,
    setLyricsStatus,
    lyricsEnhanced,
    lyricsVersion,
    skipVotes,
    skipRequired,
    listenerCount,
    trackVotes,
    currentTrack: currentTrackState,
    setTrack,
    elapsedBase,
    setElapsedBase,
    syncTime,
    setSyncTime,
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
