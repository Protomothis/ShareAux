'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { Track } from '@/api/model';
import { usePlayerControllerGetStatus } from '@/api/player/player';
import { useQueueControllerGetHistory, useQueueControllerGetQueue } from '@/api/queue/queue';
import {
  roomsControllerClearChat,
  roomsControllerJoin,
  roomsControllerKick,
  roomsControllerLeave,
  roomsControllerMuteUser,
  roomsControllerUnban,
  roomsControllerUnmuteUser,
  useRoomsControllerFindOne,
} from '@/api/rooms/rooms';
import Chat from '@/components/chat/Chat';
import { MinLoading } from '@/components/common/MinLoading';
import { WsDisconnectBanner } from '@/components/common/WsDisconnectBanner';
import type { CastState } from '@/components/player/CastButton';
import Player from '@/components/player/Player';
import DesktopQueuePanel from '@/components/queue/DesktopQueuePanel';
import HistoryPanel from '@/components/queue/HistoryPanel';
import { MobileAutoDjTab } from '@/components/queue/MobileAutoDjTab';
import Queue from '@/components/queue/Queue';
import LeaveConfirmModal from '@/components/room/LeaveConfirmModal';
import MemberList from '@/components/room/MemberList';
import MobileTabBar from '@/components/room/MobileTabBar';
import PasswordModal from '@/components/room/PasswordModal';
import RoomNav from '@/components/room/RoomNav';
import RoomSettingsModal from '@/components/room/RoomSettingsModal';
import RoomSkeleton from '@/components/room/RoomSkeleton';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/useFavorites';
import { useIsTouch } from '@/hooks/useIsTouch';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import { usePlaybackState } from '@/hooks/usePlaybackState';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { queryKeys, useInvalidate } from '@/hooks/useQueries';
import { useReactions } from '@/hooks/useReactions';
import { useRoomAudio } from '@/hooks/useRoomAudio';
import { useRoomEvents } from '@/hooks/useRoomEvents';
import { useRoomState } from '@/hooks/useRoomState';
import { useRoomSync } from '@/hooks/useRoomSync';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useWsMessages } from '@/hooks/useWsMessages';
import { WsCloseCode, WsOpCode } from '@/lib/constants';
import { getWsUrl } from '@/lib/urls';
import { useAuthStore } from '@/stores/auth';
import type { MobileTab } from '@/types';
import type { StreamState } from '@/types';
import { LyricsStatus } from '@/types';

export default function RoomClient({ id }: { id: string }) {
  const t = useTranslations('room');
  const router = useRouter();
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [needPassword, setNeedPassword] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // --- Data ---
  const {
    data: room,
    isError: roomError,
    isLoading: roomLoading,
  } = useRoomsControllerFindOne(id, { query: { retry: 1 } });
  const { data: playerData } = usePlayerControllerGetStatus(id, { query: { enabled: !roomError } });
  const isTouch = useIsTouch();
  const kbOffset = useKeyboardHeight();
  const { data: queue = [] } = useQueueControllerGetQueue(id, { query: { enabled: !roomError } });
  const { data: history = [] } = useQueueControllerGetHistory(id, { query: { enabled: !roomError } });
  const members = room?.members ?? [];

  const userId = useAuthStore((s) => s.userId);
  const nickname = useAuthStore((s) => s.nickname);
  const role = useAuthStore((s) => s.role);

  const isHost = !!(room && userId && room.hostId === userId);
  const { can } = useMyPermissions(id);
  const { favoriteIds, loadingIds: favLoadingIds, toggle: toggleFavorite } = useFavorites(role !== 'guest');
  const favorites = useMemo(
    () => ({ favoriteIds, favLoadingIds, toggleFavorite }),
    [favoriteIds, favLoadingIds, toggleFavorite],
  );

  // --- Events ---
  usePushSubscription();
  const listeningRef = useRef(false);
  const trackRef = useRef<Track | null>(null);
  const getOneWayRef = useRef<() => number>(() => 0);
  const onResyncNeededRef = useRef<(action: 'prepare' | 'send') => void>(() => {});
  const stableOnResyncNeeded = useCallback((action: 'prepare' | 'send') => onResyncNeededRef.current(action), []);

  // 재생 상태
  const playback = usePlaybackState(listeningRef, trackRef, getOneWayRef, stableOnResyncNeeded);
  const {
    currentTrack,
    setTrack,
    isPlaying,
    setPlaying,
    streamState,
    setStreamState,
    timeSync,
    setTimeSync,
    lyricsStatus,
    setLyricsStatus,
    lyricsType,
    lyricsVersion,
    audioLoading,
    setAudioLoading,
    audioLoadingRef,
    streamCodec,
    setStreamCodec,
    streamBitrate,
    setStreamBitrate,
    transStatus,
    setTransStatus,
  } = playback;

  // 방 부가 상태
  const roomState = useRoomState();
  const { skipVotes, skipRequired, listenerCount, trackVotes, autoDjStatus, mutedUntil } = roomState;

  // 이벤트 디스패처
  const events = useRoomEvents({ roomId: id, playback, roomState });
  const { messages, onChat, onSystem, goneRef } = events;

  // --- Audio ---
  const onAudioErrorRef = useRef<() => void>(() => {});
  const roomAudio = useRoomAudio(
    audioLoadingRef,
    setAudioLoading,
    (ms) => {
      if (listeningRef.current && streamState === 'streaming') {
        setTimeSync({ base: ms, at: Date.now() });
      }
    },
    useCallback(() => onAudioErrorRef.current(), []),
  );
  const { audio, volume, onAudio, handleVolumeChange, buffering } = roomAudio;

  // --- WebSocket (연결만) ---
  const wsReady = !!userId && !roomError;

  // --- Messages (opcode 라우팅) ---
  const onResyncWaitRef = useRef<() => void>(() => {});
  const onReactionRef = useRef<(index: number) => void>(() => {});
  const { handleMessage, getOneWay, buildPing } = useWsMessages({
    onAudio: useCallback(
      (frame: Uint8Array) => {
        if (listeningRef.current) onAudio(frame);
      },
      [onAudio],
    ),
    onChat,
    onSystem,
    onReaction: useCallback((index: number) => onReactionRef.current(index), []),
    onResyncWait: useCallback(() => onResyncWaitRef.current(), []),
  });

  const { send, connected: wsConnected } = useWebSocket({
    url: `${getWsUrl()}?roomId=${id}`,
    enabled: wsReady,
    onMessage: handleMessage,
    onReconnect: useCallback(() => {
      invalidate.player(id);
      invalidate.queue(id);
      invalidate.room(id);
    }, [id, invalidate]),
    onClose: useCallback(
      (code: number) => {
        // 의도적 종료 이벤트를 onSystem으로 전달
        const map: Record<number, string> = {
          [WsCloseCode.Kicked]: 'kicked',
          [WsCloseCode.RoomGone]: 'roomClosed',
          [WsCloseCode.DuplicateSession]: 'duplicateSession',
          [WsCloseCode.JoinedOtherRoom]: 'joinedOtherRoom',
        };
        if (map[code]) onSystem({ event: map[code], detail: '', data: {} });
      },
      [onSystem],
    ),
  });

  // --- Sync (resync + listening 상태) ---
  const roomSync = useRoomSync({
    send,
    prepareResync: audio.prepareResync,
    connected: wsConnected,
  });
  const { listening, setListeningState, sendResync, sendListening, onResyncWait, onResyncNeeded } = roomSync;

  // onResyncWait를 useWsMessages에 연결
  useEffect(() => {
    // handleMessage 내부에서 onResyncWait 콜백을 참조하므로 ref로 연결
  }, []);

  // onResyncNeeded를 useRoomEvents에 연결
  useEffect(() => {
    onResyncNeededRef.current = onResyncNeeded;
    onResyncWaitRef.current = onResyncWait;
    onAudioErrorRef.current = () => setListeningState(false);
  }, [onResyncNeeded, onResyncWait, setListeningState]);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening, listeningRef]);

  // RTT ping 전송 (연결 시 + heartbeat 시)
  useEffect(() => {
    if (!wsConnected) return;
    // 초기 캘리브레이션
    for (let i = 0; i < 3; i++) setTimeout(() => send(buildPing()), i * 100);
    const interval = setInterval(() => send(buildPing()), 30_000);
    return () => clearInterval(interval);
  }, [wsConnected, send, buildPing]);

  useEffect(() => {
    getOneWayRef.current = getOneWay;
  }, [getOneWay]);

  // 듣는 중 실수로 페이지 이탈 방지
  useEffect(() => {
    if (!listening) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [listening]);

  useEffect(() => {
    trackRef.current = currentTrack;
  }, [currentTrack, trackRef]);

  const track = useMemo(
    () =>
      currentTrack
        ? {
            id: currentTrack.id,
            sourceId: currentTrack.sourceId,
            provider: currentTrack.provider,
            name: currentTrack.name,
            artist: currentTrack.artist,
            thumbnail: currentTrack.thumbnail,
            durationMs: currentTrack.durationMs,
            songTitle: currentTrack.songTitle,
            songArtist: currentTrack.songArtist,
          }
        : null,
    [currentTrack],
  );

  // --- Reactions ---
  const { floatingReactions, onReaction } = useReactions();
  useEffect(() => {
    onReactionRef.current = onReaction;
  }, [onReaction]);
  const sendReaction = useCallback(
    (index: number) => {
      send(new Uint8Array([WsOpCode.Reaction, index]));
    },
    [send],
  );

  // --- (WebSocket/Sync/Messages는 위에서 설정 완료) ---

  // --- Room join ---
  const joinRoom = useCallback(
    async (pw?: string) => {
      try {
        await roomsControllerJoin(id, { password: pw });
        setNeedPassword(false);
      } catch (e: unknown) {
        const err = e as { response?: { status: number } };
        if (err.response?.status === 403) setNeedPassword(true);
      }
    },
    [id],
  );

  useEffect(() => {
    goneRef.current = false;
    const id = setTimeout(joinRoom, 0);
    return () => clearTimeout(id);
  }, [joinRoom, goneRef]);

  // --- Leave beacon 제거 ---
  // WS disconnect grace period (5s)가 퇴장 처리를 담당.
  // sendBeacon leave는 grace를 우회하여 새로고침 시 방이 터지는 원인이었음.

  // roomError는 렌더 단계에서 처리 (위 if문)

  // --- Initial player state ---
  useEffect(() => {
    if (!playerData?.isPlaying || !playerData.track) return;
    setPlaying(true);
    setTrack(playerData.track);
    trackRef.current = playerData.track;
    setTimeSync({ base: (playerData.elapsedMs ?? 0) + (getOneWayRef.current() ?? 0), at: Date.now() });
    if (playerData.streamState) setStreamState(playerData.streamState as StreamState);
    if (playerData.streamCodec) setStreamCodec(playerData.streamCodec);
    if (playerData.streamBitrate) setStreamBitrate(playerData.streamBitrate);
    if (playerData.transStatus !== undefined) setTransStatus(playerData.transStatus ?? null);
    const ls = playerData.track.lyricsStatus;
    if (ls === 'found') setLyricsStatus(LyricsStatus.Found);
    else if (ls === 'not_found') setLyricsStatus(LyricsStatus.NotFound);
  }, [
    playerData,
    id,
    setPlaying,
    setTrack,
    setTimeSync,
    setLyricsStatus,
    setStreamState,
    setStreamCodec,
    setStreamBitrate,
    setTransStatus,
  ]);

  // --- Media Session ---
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name,
        artist: track.artist ?? undefined,
        artwork: track.thumbnail ? [{ src: track.thumbnail, sizes: '320x180', type: 'image/jpeg' }] : [],
      });
    } else {
      navigator.mediaSession.metadata = null;
    }
  }, [track]);

  // --- Handlers ---
  const handleSend = useCallback(
    (message: string) => {
      const payload = new TextEncoder().encode(
        JSON.stringify({ userId: userId ?? '', nickname, message, timestamp: new Date().toISOString() }),
      );
      const frame = new Uint8Array(1 + payload.length);
      frame[0] = WsOpCode.Chat;
      frame.set(payload, 1);
      send(frame);
    },
    [send, userId, nickname],
  );

  const handleCommand = useCallback(
    async (command: string, targetUserId?: string) => {
      try {
        switch (command) {
          case 'ban':
            if (targetUserId) await roomsControllerKick(id, targetUserId);
            break;
          case 'unban':
            if (targetUserId) await roomsControllerUnban(id, targetUserId);
            break;
          case 'mute':
            if (targetUserId) await roomsControllerMuteUser(id, targetUserId);
            break;
          case 'unmute':
            if (targetUserId) await roomsControllerUnmuteUser(id, targetUserId);
            break;
          case 'clear':
            await roomsControllerClearChat(id);
            break;
        }
      } catch {
        /* 에러는 global handler에서 처리 */
      }
    },
    [id],
  );

  const handleLeave = async () => {
    goneRef.current = true;
    try {
      await roomsControllerLeave(id);
    } catch {
      /* ignore */
    }
    queryClient.removeQueries({ queryKey: queryKeys.room(id) });
    queryClient.removeQueries({ queryKey: queryKeys.queue(id) });
    queryClient.removeQueries({ queryKey: queryKeys.player(id) });
    router.push('/rooms');
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/rooms/${id}?invite=1`;
    if (navigator.share) {
      try {
        await navigator.share({ title: room?.name ?? 'ShareAux', url });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard?.writeText(url);
      toast.success(t('linkCopied'));
    }
  };

  const playerProps = {
    roomId: id,
    isHost,
    track,
    canVoteSkip: can('voteSkip'),
    onVolumeChange: handleVolumeChange,
    onListenToggle: async () => {
      if (!listening) {
        if (!audio.supported) {
          toast.error(t('mseNotSupported'));
          return;
        }
        setAudioLoading(true);
        audioLoadingRef.current = true;
        setListeningState(true);
        await audio.init();
        sendListening(true);
        if (streamState === 'streaming') sendResync();
      } else {
        audio.pause();
        setListeningState(false);
        sendListening(false);
      }
    },
    listening,
    audioLoading: audioLoading || buffering,
    volume,
    skipVotes,
    skipRequired,
    elapsedBase: timeSync.base,
    syncTime: timeSync.at,
    isPlaying,
    hasNext: queue.length > 0,
    hasPrev: history.length > 0,
    getAnalyser: isTouch ? undefined : audio.getAnalyser,
    getDelay: audio.getDelay,
    streamCodec: streamCodec ?? undefined,
    streamBitrate: streamBitrate ?? undefined,
    transStatus,
    lyricsStatus,
    lyricsType,
    lyricsVersion,
    trackVotes,
    autoDjEnabled: room?.autoDjEnabled,
    autoDjStatus,
    streamState,
    onSkipError: () => invalidate.player(id),
    isFavorite: track ? favorites.favoriteIds.has(track.sourceId) : false,
    favoriteLoading: track ? favorites.favLoadingIds.has(track.sourceId) : false,
    onToggleFavorite: track && role !== 'guest' ? () => favorites.toggleFavorite(track) : undefined,
    onCastStateChange: (state: CastState) => {
      audio.setMuted(state === 'connected');
    },
  };

  const chatProps = {
    messages,
    onSend: handleSend,
    onCommand: handleCommand,
    onReaction: sendReaction,
    floatingReactions,
    canChat: can('chat'),
    canReaction: can('reaction'),
    hostId: room?.hostId ?? '',
    mutedUntil,
    isHost,
    members,
    currentUserId: userId ?? undefined,
    roomId: id,
  };

  const memberListProps = {
    members,
    hostId: room?.hostId ?? '',
    roomId: id,
    isHost,
    userId: userId ?? undefined,
  };

  if (!room) {
    if (roomError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-room-gradient text-white">
          <p className="mb-2 text-4xl">🎵</p>
          <p className="mb-1 text-lg font-semibold">방을 찾을 수 없습니다</p>
          <p className="mb-6 text-sm text-white/50">종료되었거나 존재하지 않는 방입니다</p>
          <Button variant="accent" onClick={() => router.push('/rooms')}>
            방 목록으로
          </Button>
        </div>
      );
    }
    return (
      <MinLoading loading={roomLoading} fallback={<RoomSkeleton />}>
        <RoomSkeleton />
      </MinLoading>
    );
  }

  return (
    <main
      className="fixed inset-0 flex flex-col overflow-hidden bg-room-gradient"
      style={kbOffset ? { height: `${window.innerHeight - kbOffset}px` } : undefined}
    >
      <RoomNav
        roomId={id}
        roomName={room.name}
        memberCount={members.length}
        listenerCount={listenerCount}
        isHost={isHost}
        onShare={handleShare}
        onSettings={() => setShowSettings(true)}
        onLeave={() => setShowLeaveConfirm(true)}
      />

      <WsDisconnectBanner connected={wsConnected} />

      {/* Mobile Player */}
      <div className="shrink-0 border-b border-white/[0.06] lg:hidden">
        <Player {...playerProps} />
      </div>

      {/* Desktop Layout */}
      <div className="hidden flex-1 overflow-hidden p-4 gap-4 lg:grid lg:grid-cols-[420px_1fr] lg:grid-rows-[auto_1fr]">
        <div className="shrink-0">
          <Player {...playerProps} />
        </div>
        <div className="row-span-2 flex flex-col overflow-hidden glass rounded-2xl">
          <div className="shrink-0 max-h-48 overflow-y-auto border-b border-white/10">
            <MemberList {...memberListProps} />
          </div>
          <div className="flex-1 overflow-hidden">
            <Chat
              messages={messages}
              onSend={handleSend}
              onCommand={handleCommand}
              onReaction={sendReaction}
              floatingReactions={floatingReactions}
              canChat={can('chat')}
              canReaction={can('reaction')}
              mutedUntil={mutedUntil}
              isHost={isHost}
              members={members}
              currentUserId={userId ?? undefined}
              roomId={id}
            />
          </div>
        </div>
        <div className="overflow-hidden glass rounded-2xl">
          <DesktopQueuePanel
            roomId={id}
            canSearch={can('addQueue')}
            canEnqueue={can('addQueue')}
            canReorder={isHost || can('host')}
            isHost={isHost}
            isGuest={role === 'guest'}
            maxSelectPerAdd={room.maxSelectPerAdd}
            trackVotes={trackVotes}
            autoDjStatus={autoDjStatus}
            autoDjEnabled={room?.autoDjEnabled}
            autoDjMode={room?.autoDjMode}
            autoDjPaused={room?.autoDjPaused}
            autoDjTags={room?.autoDjTags}
            autoDjPrompt={room?.autoDjPrompt}
            favorites={favorites}
          />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={mobileTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="min-h-0 flex-1 overflow-y-auto bg-white/[0.02]"
          >
            {mobileTab === 'chat' && <Chat {...chatProps} />}
            {mobileTab === 'queue' && (
              <Queue
                roomId={id}
                canSearch={can('addQueue')}
                canEnqueue={can('addQueue')}
                canReorder={isHost || can('host')}
                isHost={isHost}
                isGuest={role === 'guest'}
                maxSelectPerAdd={room.maxSelectPerAdd}
                trackVotes={trackVotes}
                autoDjStatus={autoDjStatus}
                favorites={favorites}
              />
            )}
            {mobileTab === 'history' && <HistoryPanel roomId={id} isGuest={role === 'guest'} favorites={favorites} />}
            {mobileTab === 'autodj' && room?.autoDjEnabled && (
              <div className="h-full overflow-y-auto p-4">
                <MobileAutoDjTab roomId={id} room={room} isHost={isHost} />
              </div>
            )}
            {mobileTab === 'members' && <MemberList {...memberListProps} />}
          </motion.div>
        </AnimatePresence>
        <MobileTabBar activeTab={mobileTab} onTabChange={setMobileTab} autoDjEnabled={room?.autoDjEnabled} />
      </div>

      {/* Modals */}
      <PasswordModal open={needPassword} onSubmit={joinRoom} onClose={() => router.push('/rooms')} />
      <RoomSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        roomId={id}
        roomName={room.name}
        enqueueWindowMin={room.enqueueWindowMin ?? 30}
        enqueueLimitPerWindow={room.enqueueLimitPerWindow ?? 15}
        crossfade={room.crossfade ?? true}
        maxSelectPerAdd={room.maxSelectPerAdd ?? 3}
        replayCooldownMin={room.replayCooldownMin ?? 0}
        defaultEnqueueEnabled={room.defaultEnqueueEnabled ?? true}
        defaultVoteSkipEnabled={room.defaultVoteSkipEnabled ?? true}
        autoDjEnabled={room.autoDjEnabled ?? false}
        autoDjMode={room.autoDjMode ?? 'related'}
        autoDjThreshold={room.autoDjThreshold ?? 2}
        autoDjFolderId={room.autoDjFolderId}
        autoDjFavFallbackMixed={room.autoDjFavFallbackMixed}
        onSaved={() => invalidate.room(id)}
      />
      <LeaveConfirmModal open={showLeaveConfirm} onConfirm={handleLeave} onClose={() => setShowLeaveConfirm(false)} />
    </main>
  );
}
