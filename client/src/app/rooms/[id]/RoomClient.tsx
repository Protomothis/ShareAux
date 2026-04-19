'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { Track } from '@/api/model';
import { usePlayerControllerGetStatus } from '@/api/player/player';
import { useQueueControllerGetHistory, useQueueControllerGetQueue } from '@/api/queue/queue';
import { roomsControllerJoin, roomsControllerLeave, useRoomsControllerFindOne } from '@/api/rooms/rooms';
import Chat from '@/components/chat/Chat';
import Player from '@/components/player/Player';
import Queue from '@/components/queue/Queue';
import { AnimatePresence, motion } from 'motion/react';

import HistoryPanel from '@/components/queue/HistoryPanel';
import DesktopQueuePanel from '@/components/queue/DesktopQueuePanel';
import LeaveConfirmModal from '@/components/room/LeaveConfirmModal';
import MemberList from '@/components/room/MemberList';
import MobileTabBar from '@/components/room/MobileTabBar';
import PasswordModal from '@/components/room/PasswordModal';
import RoomNav from '@/components/room/RoomNav';
import RoomSettingsModal from '@/components/room/RoomSettingsModal';
import { MinLoading } from '@/components/common/MinLoading';
import { WsDisconnectBanner } from '@/components/common/WsDisconnectBanner';
import RoomSkeleton from '@/components/room/RoomSkeleton';
import { Button } from '@/components/ui/button';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import { queryKeys, useInvalidate } from '@/hooks/useQueries';
import { useReactions } from '@/hooks/useReactions';
import { useRoomAudio } from '@/hooks/useRoomAudio';
import { useRoomEvents } from '@/hooks/useRoomEvents';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useIsTouch } from '@/hooks/useIsTouch';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useAuthStore } from '@/stores/auth';
import type { MobileTab } from '@/types';
import { LyricsStatus } from '@/types';
import type { StreamState } from '@/types';

import { getWsUrl } from '@/lib/urls';

export default function RoomClient({ id }: { id: string }) {
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
  const { data: playerData } = usePlayerControllerGetStatus(id);
  const isTouch = useIsTouch();
  const kbOffset = useKeyboardHeight();
  const { data: queue = [] } = useQueueControllerGetQueue(id);
  const { data: history = [] } = useQueueControllerGetHistory(id);
  const members = room?.members ?? [];

  const userId = useAuthStore((s) => s.userId);
  const nickname = useAuthStore((s) => s.nickname);

  const isHost = !!(room && userId && room.hostId === userId);
  const { can } = useMyPermissions(id);

  // --- Events ---
  const listeningRef = useRef(false);
  const trackRef = useRef<Track | null>(null);
  const getOneWayRef = useRef<() => number>(() => 0);
  const getCurrentTimeRef = useRef<() => number>(() => 0);
  const events = useRoomEvents(id, listeningRef, trackRef, getOneWayRef, getCurrentTimeRef);
  const {
    messages,
    isPlaying,
    setPlaying,
    lyricsStatus,
    lyricsEnhanced,
    lyricsVersion,
    skipVotes,
    setLyricsStatus,

    skipRequired,
    listenerCount,
    trackVotes,
    currentTrack,
    setTrack,
    elapsedBase,
    setElapsedBase,
    syncTime,
    setSyncTime,
    audioLoading,
    setAudioLoading,
    audioLoadingRef,
    onChat,
    onSystem,
    goneRef,
    autoDjStatus,
    streamState,
    setStreamState,
    mutedUntil,
  } = events;

  // --- Audio ---
  const roomAudio = useRoomAudio(audioLoadingRef, setAudioLoading, () => wsActionsRef.current?.sendResync());
  const { audio, listening, volume, onAudio, handleListenToggle, handleVolumeChange } = roomAudio;
  useEffect(() => {
    if (streamState === 'skipping' || streamState === 'preparing') {
      void audio.prepareResync().then(() => wsActionsRef.current?.sendResync());
    }
  }, [streamState, audio]);
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening, listeningRef]);
  useEffect(() => {
    trackRef.current = currentTrack;
  }, [currentTrack, trackRef]);

  const track = useMemo(
    () =>
      currentTrack
        ? {
            id: currentTrack.id,
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

  // --- WebSocket ---
  // WS는 same-origin 쿠키 자동 전송. roomId만 query로 전달
  const wsReady = !!userId;
  const wsActionsRef = useRef<{ sendListening: (v: boolean) => void; sendResync: () => void }>(null!);

  const { sendChat, sendListening, sendReaction, sendResync, getOneWay, wsConnected } = useWebSocket({
    url: `${getWsUrl()}?roomId=${id}`,
    enabled: wsReady,
    onAudio,
    onChat,
    onSystem,
    onReaction,
    onReconnect: useCallback(() => {
      invalidate.player(id);
      invalidate.queue(id);
      invalidate.room(id);
      if (listeningRef.current) {
        setTimeout(() => {
          wsActionsRef.current?.sendListening(true);
          wsActionsRef.current?.sendResync();
        }, 100);
      }
    }, [id, invalidate]),
  });
  useEffect(() => {
    wsActionsRef.current = { sendListening, sendResync };
    getOneWayRef.current = getOneWay;
    getCurrentTimeRef.current = audio.getCurrentTime;
  }, [sendListening, sendResync, getOneWay, audio.getCurrentTime]);

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
    setElapsedBase((playerData.elapsedMs ?? 0) + (getOneWayRef.current() ?? 0));
    setSyncTime(Date.now());
    if (playerData.streamState) setStreamState(playerData.streamState as StreamState);
    const ls = playerData.track.lyricsStatus;
    if (ls === 'found') setLyricsStatus(LyricsStatus.Found);
    else if (ls === 'not_found') setLyricsStatus(LyricsStatus.NotFound);
  }, [playerData, id, setPlaying, setTrack, setElapsedBase, setSyncTime, setLyricsStatus, setStreamState]);

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
    (message: string) => sendChat(message, userId ?? '', nickname),
    [sendChat, userId, nickname],
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
      await navigator.clipboard.writeText(url);
      toast.success('링크가 복사되었습니다');
    }
  };

  const playerProps = {
    roomId: id,
    isHost,
    track,
    canVoteSkip: can('voteSkip'),
    onVolumeChange: handleVolumeChange,
    onListenToggle: () => handleListenToggle(sendListening, sendResync),
    listening,
    audioLoading,
    volume,
    skipVotes,
    skipRequired,
    elapsedBase,
    syncTime,
    isPlaying,
    hasNext: queue.length > 0,
    hasPrev: history.length > 0,
    getAnalyser: isTouch ? undefined : audio.getAnalyser,
    getDelay: audio.getDelay,
    streamCodec: playerData?.streamCodec,
    streamBitrate: playerData?.streamBitrate,
    lyricsStatus,
    lyricsEnhanced,
    lyricsVersion,
    trackVotes,
    autoDjEnabled: room?.autoDjEnabled,
    autoDjStatus,
    streamState,
    onSkipError: () => invalidate.player(id),
  };

  const chatProps = {
    messages,
    onSend: handleSend,
    onReaction: sendReaction,
    floatingReactions,
    canChat: can('chat'),
    canReaction: can('reaction'),
    hostId: room?.hostId ?? '',
    mutedUntil,
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
              onReaction={sendReaction}
              floatingReactions={floatingReactions}
              canChat={can('chat')}
              canReaction={can('reaction')}
              mutedUntil={mutedUntil}
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
            maxSelectPerAdd={room.maxSelectPerAdd}
            trackVotes={trackVotes}
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
                maxSelectPerAdd={room.maxSelectPerAdd}
                trackVotes={trackVotes}
                autoDjStatus={autoDjStatus}
              />
            )}
            {mobileTab === 'history' && <HistoryPanel roomId={id} />}
            {mobileTab === 'members' && <MemberList {...memberListProps} />}
          </motion.div>
        </AnimatePresence>
        <MobileTabBar activeTab={mobileTab} onTabChange={setMobileTab} />
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
        onSaved={() => invalidate.room(id)}
      />
      <LeaveConfirmModal open={showLeaveConfirm} onConfirm={handleLeave} onClose={() => setShowLeaveConfirm(false)} />
    </main>
  );
}
