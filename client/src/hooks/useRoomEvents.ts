'use client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { RoomQueue, Track, TrackLyricsType } from '@/api/model';
import { SystemChatEvent } from '@/api/model';
import { roomsControllerFindOne } from '@/api/rooms/rooms';
import { useInvalidate } from '@/hooks/useQueries';
import type { AutoDjStatus, ChatMessage, LyricsStatus } from '@/types';
import { WsEvent } from '@/types';

import type { usePlaybackState } from './usePlaybackState';
import type { useRoomState } from './useRoomState';

type PlaybackActions = ReturnType<typeof usePlaybackState>;
type RoomStateActions = ReturnType<typeof useRoomState>;

interface UseRoomEventsOptions {
  roomId: string;
  playback: PlaybackActions;
  roomState: RoomStateActions;
}

/**
 * useRoomEvents — 이벤트 디스패처
 * onChat/onSystem 콜백을 제공하고, 이벤트를 적절한 상태 훅에 위임.
 */
export function useRoomEvents({ roomId, playback, roomState }: UseRoomEventsOptions) {
  const router = useRouter();
  const invalidate = useInvalidate();
  const t = useTranslations('room');
  const goneRef = useRef(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const onChat = useCallback((data: ChatMessage) => {
    setMessages((prev) => prev.slice(-200).concat({ ...data, type: 'chat' }));
  }, []);

  // --- Navigation ---
  const handleNavigation = useCallback(
    (event: string) => {
      if (goneRef.current) return true;
      const nav: Partial<Record<string, { msg: string; level: 'info' | 'error' }>> = {
        [WsEvent.roomClosed]: { msg: t('nav.roomClosed'), level: 'info' },
        [WsEvent.userKicked]: { msg: t('nav.kicked'), level: 'error' },
        [WsEvent.duplicateSession]: { msg: t('nav.duplicateSession'), level: 'info' },
        [WsEvent.joinedOtherRoom]: { msg: '', level: 'info' },
      };
      const entry = nav[event];
      if (!entry) return false;
      goneRef.current = true;
      if (entry.msg) toast[entry.level](entry.msg);
      router.push('/rooms');
      return true;
    },
    [router],
  );

  // --- System event dispatcher ---
  const onSystem = useCallback(
    (data: { event: string; detail: string; data?: Record<string, unknown> }) => {
      // 채팅 제한
      if (data.event === WsEvent.chatMuted) {
        const seconds = parseInt(data.detail, 10) || 30;
        roomState.setMutedUntil(Date.now() + seconds * 1000);
        toast.error(t('chatMuted', { seconds }));
        return;
      }

      if (data.event === WsEvent.chatCleared) {
        setMessages([
          { type: 'system', userId: '', nickname: '', message: 'chatCleared', timestamp: new Date().toISOString() },
        ]);
        return;
      }

      // 네비게이션
      if (handleNavigation(data.event)) return;

      // 권한 변경
      if (data.event === WsEvent.permissionChanged) {
        const key = data.detail === 'djTransferred' ? 'djTransferred' : 'permissionChanged';
        toast.info(t(`nav.${key}` as 'nav.djTransferred' | 'nav.permissionChanged'));
        invalidate.permissions(roomId);
        return;
      }

      // 재생 상태
      if (data.event === WsEvent.playbackUpdated && data.data) {
        playback.handlePlayback(
          data.data as { track?: Track; elapsedMs?: number; isPlaying?: boolean; streamState?: string },
        );
        return;
      }

      // 가사
      if (data.event === WsEvent.lyricsResult && data.data) {
        const { status, lyricsType } = data.data as { status: LyricsStatus; lyricsType?: TrackLyricsType };
        playback.setLyricsStatus(status);
        playback.setLyricsType(lyricsType ?? null);
        return;
      }
      if (data.event === WsEvent.lyricsUpdated && data.data) {
        playback.setLyricsVersion((v) => v + 1);
        playback.setTransStatus('done');
        return;
      }

      // 메타데이터 갱신
      if (data.event === WsEvent.metadataUpdated && data.data) {
        const d = data.data as { artist?: string; title?: string };
        playback.setTrack((prev: Track | null) =>
          prev ? { ...prev, artist: d.artist ?? prev.artist, name: d.title ?? prev.name } : prev,
        );
        return;
      }

      // 큐/AutoDJ
      if (data.event === WsEvent.queueUpdated) {
        const d = data.data as { queue?: RoomQueue[] } | undefined;
        if (d?.queue) invalidate.setQueue(roomId, d.queue);
        else invalidate.queue(roomId);
        invalidate.history(roomId);
        invalidate.autoDjCandidates(roomId);
        return;
      }
      if (data.event === WsEvent.autoDjStatus && data.data) {
        roomState.setAutoDjStatus((data.data as { status: AutoDjStatus }).status);
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
        roomState.setSkipVotes(d.currentVotes);
        roomState.setSkipRequired(d.required);
        return;
      }
      if (data.event === WsEvent.trackVote && data.data) {
        const { trackId, likes, dislikes } = data.data as { trackId: string; likes: number; dislikes: number };
        roomState.setTrackVotes((prev) => new Map(prev).set(trackId, { likes, dislikes }));
        return;
      }

      // 리스너 수
      if (data.event === WsEvent.listenerCount && data.data) {
        roomState.setListenerCount((data.data as { count: number }).count);
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
    [roomId, invalidate, handleNavigation, playback, roomState],
  );

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

  return { messages, setMessages, onChat, onSystem, goneRef, markGone };
}
