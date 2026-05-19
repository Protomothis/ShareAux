'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { Track } from '@/api/model';
import { usePlayerControllerGetStatus } from '@/api/player/player';
import { useQueueControllerGetHistory, useQueueControllerGetQueue } from '@/api/queue/queue';
import { useRoomsControllerFindOne } from '@/api/rooms/rooms';
import Chat from '@/components/chat/Chat';
import { Button } from '@/components/common/Button';
import { MinLoading } from '@/components/common/MinLoading';
import { SlotErrorBoundary } from '@/components/common/SlotErrorBoundary';
import { WsDisconnectBanner } from '@/components/common/WsDisconnectBanner';
import type { CastState } from '@/components/player/CastButton';
import Player from '@/components/player/Player';
import DesktopQueuePanel from '@/components/queue/DesktopQueuePanel';
import HistoryPanel from '@/components/queue/HistoryPanel';
import { MobileAutoDjTab } from '@/components/queue/MobileAutoDjTab';
import Queue from '@/components/queue/Queue';
import LeaveConfirmModal from '@/components/room/LeaveConfirmModal';
import MemberList from '@/components/room/MemberList';
import PasswordModal from '@/components/room/PasswordModal';
import { RoomLayout } from '@/components/room/RoomLayout';
import RoomNav from '@/components/room/RoomNav';
import RoomSettingsModal from '@/components/room/RoomSettingsModal';
import RoomSkeleton from '@/components/room/RoomSkeleton';
import { useFavorites } from '@/hooks/useFavorites';
import { useIsTouch } from '@/hooks/useIsTouch';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import { usePlaybackState } from '@/hooks/usePlaybackState';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { useInvalidate } from '@/hooks/useQueries';
import { useReactions } from '@/hooks/useReactions';
import { useRoomAudio } from '@/hooks/useRoomAudio';
import { useRoomChat } from '@/hooks/useRoomChat';
import { useRoomEvents } from '@/hooks/useRoomEvents';
import { useRoomSetup } from '@/hooks/useRoomSetup';
import { useRoomState } from '@/hooks/useRoomState';
import { useRoomSync } from '@/hooks/useRoomSync';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useWsMessages } from '@/hooks/useWsMessages';
import { WsCloseCode, WsOpCode } from '@/lib/constants';
import { getWsUrl } from '@/lib/urls';
import { useAuthStore } from '@/stores/auth';
import { LyricsStatus } from '@/types';

export default function RoomClient({ id }: { id: string }) {
  const t = useTranslations('room');
  const invalidate = useInvalidate();

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

  // --- Refs (훅 간 연결) ---
  usePushSubscription();
  const listeningRef = useRef(false);
  const trackRef = useRef<Track | null>(null);
  const getOneWayRef = useRef<() => number>(() => 0);
  const onResyncNeededRef = useRef<(action: 'prepare' | 'send') => void>(() => {});
  const stableOnResyncNeeded = useCallback((action: 'prepare' | 'send') => onResyncNeededRef.current(action), []);

  // --- Playback & Room State ---
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

  const roomState = useRoomState();
  const { skipVotes, skipRequired, listenerCount, trackVotes, autoDjStatus, mutedUntil } = roomState;

  // --- Events ---
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

  // --- WebSocket ---
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
    enabled: !!userId && !roomError,
    onMessage: handleMessage,
    onReconnect: useCallback(() => {
      invalidate.player(id);
      invalidate.queue(id);
      invalidate.room(id);
    }, [id, invalidate]),
    onClose: useCallback(
      (code: number) => {
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

  // --- Sync ---
  const roomSync = useRoomSync({ send, prepareResync: audio.prepareResync, connected: wsConnected });
  const { listening, setListeningState, sendResync, sendListening, onResyncWait, onResyncNeeded } = roomSync;

  useEffect(() => {
    onResyncNeededRef.current = onResyncNeeded;
    onResyncWaitRef.current = onResyncWait;
    onAudioErrorRef.current = () => setListeningState(false);
  }, [onResyncNeeded, onResyncWait, setListeningState]);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  // RTT ping
  useEffect(() => {
    if (!wsConnected) return;
    for (let i = 0; i < 3; i++) setTimeout(() => send(buildPing()), i * 100);
    const interval = setInterval(() => send(buildPing()), 30_000);
    return () => clearInterval(interval);
  }, [wsConnected, send, buildPing]);

  useEffect(() => {
    getOneWayRef.current = getOneWay;
  }, [getOneWay]);

  // beforeunload guard
  useEffect(() => {
    if (!listening) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [listening]);

  useEffect(() => {
    trackRef.current = currentTrack;
  }, [currentTrack]);

  // --- Setup (join/leave/share) ---
  const setup = useRoomSetup({ roomId: id, roomName: room?.name, goneRef });
  const {
    needPassword,
    showSettings,
    setShowSettings,
    showLeaveConfirm,
    setShowLeaveConfirm,
    joinRoom,
    handleLeave,
    handleShare,
  } = setup;

  // --- Chat ---
  const chat = useRoomChat({ roomId: id, userId, nickname, send });
  const { handleSend, handleCommand } = chat;

  // --- Reactions ---
  const { floatingReactions, onReaction } = useReactions();
  useEffect(() => {
    onReactionRef.current = onReaction;
  }, [onReaction]);
  const sendReaction = useCallback((index: number) => send(new Uint8Array([WsOpCode.Reaction, index])), [send]);

  // --- Initial player state ---
  useEffect(() => {
    if (!playerData?.isPlaying || !playerData.track) return;
    setPlaying(true);
    setTrack(playerData.track);
    trackRef.current = playerData.track;
    setTimeSync({ base: (playerData.elapsedMs ?? 0) + (getOneWayRef.current() ?? 0), at: Date.now() });
    if (playerData.streamState) setStreamState(playerData.streamState);
    if (playerData.streamCodec) setStreamCodec(playerData.streamCodec);
    if (playerData.streamBitrate) setStreamBitrate(playerData.streamBitrate);
    if (playerData.transStatus !== undefined) setTransStatus(playerData.transStatus ?? null);
    const ls = playerData.track.lyricsStatus;
    if (ls === 'found') setLyricsStatus(LyricsStatus.found);
    else if (ls === LyricsStatus.notFound) setLyricsStatus(LyricsStatus.notFound);
  }, [
    playerData,
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

  // --- Props ---
  const playerProps = useMemo(
    () => ({
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
      onCastStateChange: (state: CastState) => audio.setMuted(state === 'connected'),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      id,
      isHost,
      track,
      listening,
      audioLoading,
      buffering,
      volume,
      skipVotes,
      skipRequired,
      timeSync,
      isPlaying,
      queue.length,
      history.length,
      isTouch,
      streamCodec,
      streamBitrate,
      transStatus,
      lyricsStatus,
      lyricsType,
      lyricsVersion,
      trackVotes,
      autoDjStatus,
      streamState,
      room?.autoDjEnabled,
      favorites,
      role,
    ],
  );

  const chatProps = useMemo(
    () => ({
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
    }),
    [
      messages,
      handleSend,
      handleCommand,
      sendReaction,
      floatingReactions,
      can,
      room?.hostId,
      mutedUntil,
      isHost,
      members,
      userId,
      id,
    ],
  );

  const memberListProps = useMemo(
    () => ({
      members,
      hostId: room?.hostId ?? '',
      roomId: id,
      isHost,
      userId: userId ?? undefined,
    }),
    [members, room?.hostId, id, isHost, userId],
  );

  // --- Render ---
  if (!room) {
    if (roomError) {
      return (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center bg-room-gradient text-white"
          role="alert"
        >
          <p className="mb-2 text-4xl">🎵</p>
          <p className="mb-1 text-lg font-semibold">{t('roomNotFound')}</p>
          <p className="mb-6 text-sm text-white/50">{t('roomNotFoundDesc')}</p>
          <Button variant="accent" onClick={() => setup.handleLeave()}>
            {t('backToRooms')}
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

      <RoomLayout
        banner={<WsDisconnectBanner connected={wsConnected} />}
        player={
          <SlotErrorBoundary>
            <Player {...playerProps} />
          </SlotErrorBoundary>
        }
        chat={
          <SlotErrorBoundary>
            <Chat {...chatProps} />
          </SlotErrorBoundary>
        }
        members={
          <SlotErrorBoundary>
            <MemberList {...memberListProps} />
          </SlotErrorBoundary>
        }
        queuePanel={
          <SlotErrorBoundary>
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
          </SlotErrorBoundary>
        }
        queue={
          <SlotErrorBoundary>
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
          </SlotErrorBoundary>
        }
        history={
          <SlotErrorBoundary>
            <HistoryPanel roomId={id} isGuest={role === 'guest'} favorites={favorites} />
          </SlotErrorBoundary>
        }
        autodj={
          room?.autoDjEnabled ? (
            <SlotErrorBoundary>
              <div className="h-full overflow-y-auto p-4">
                <MobileAutoDjTab roomId={id} room={room} isHost={isHost} />
              </div>
            </SlotErrorBoundary>
          ) : undefined
        }
        autoDjEnabled={room?.autoDjEnabled}
        autoDjPaused={room?.autoDjPaused}
        modals={
          <>
            <PasswordModal open={needPassword} onSubmit={joinRoom} onClose={() => setup.handleLeave()} />
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
            <LeaveConfirmModal
              open={showLeaveConfirm}
              onConfirm={handleLeave}
              onClose={() => setShowLeaveConfirm(false)}
            />
          </>
        }
      />
    </main>
  );
}
