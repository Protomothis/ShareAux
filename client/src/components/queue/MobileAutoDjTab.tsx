'use client';

import { useCallback, useState } from 'react';

import { useAuthControllerGetAuthConfig } from '@/api/auth/auth';
import type { AutoDjCandidateItem, AutoDjCandidatesResponse, Room } from '@/api/model';
import {
  roomsControllerPinAutoDjCandidate,
  roomsControllerRefreshAutoDjPool,
  roomsControllerSkipAutoDjCandidate,
  roomsControllerToggleAutoDjPause,
  roomsControllerUpdate,
  useRoomsControllerGetAutoDjCandidates,
} from '@/api/rooms/rooms';

import type { AutoDjMode } from './AutoDjModeSelect';
import { AutoDjTab } from './AutoDjTab';
import type { AutoDjTags } from './AutoDjTagFilter';

interface MobileAutoDjTabProps {
  roomId: string;
  room: Room;
  isHost: boolean;
}

export function MobileAutoDjTab({ roomId, room, isHost }: MobileAutoDjTabProps) {
  const [refreshing, setRefreshing] = useState(false);
  const { data: config } = useAuthControllerGetAuthConfig();
  const { data: candidatesData, refetch } = useRoomsControllerGetAutoDjCandidates(roomId);

  const candidates: AutoDjCandidateItem[] = (candidatesData as AutoDjCandidatesResponse | undefined)?.candidates ?? [];

  const handleModeChange = useCallback(
    (mode: AutoDjMode) => {
      if (!isHost) return;
      roomsControllerUpdate(roomId, { autoDjMode: mode });
    },
    [roomId, isHost],
  );

  const handleApply = useCallback(
    async (tags: AutoDjTags, prompt: string) => {
      if (!isHost) return;
      await roomsControllerUpdate(roomId, { autoDjTags: tags, autoDjPrompt: prompt });
      setRefreshing(true);
      await roomsControllerRefreshAutoDjPool(roomId);
      await refetch();
      setRefreshing(false);
    },
    [roomId, isHost, refetch],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await roomsControllerRefreshAutoDjPool(roomId);
    await refetch();
    setRefreshing(false);
  }, [roomId, refetch]);

  const handlePin = useCallback(
    async (trackId: string) => {
      await roomsControllerPinAutoDjCandidate(roomId, trackId);
      refetch();
    },
    [roomId, refetch],
  );

  const handleSkip = useCallback(
    async (trackId: string) => {
      await roomsControllerSkipAutoDjCandidate(roomId, trackId);
      refetch();
    },
    [roomId, refetch],
  );

  const handleTogglePause = useCallback(async () => {
    await roomsControllerToggleAutoDjPause(roomId);
  }, [roomId]);

  const savedTags: AutoDjTags = (room.autoDjTags as AutoDjTags | null) ?? {
    mood: [],
    genre: [],
    era: [],
    country: [],
  };

  return (
    <AutoDjTab
      mode={room.autoDjMode as AutoDjMode}
      onModeChange={handleModeChange}
      paused={room.autoDjPaused}
      onTogglePause={handleTogglePause}
      savedTags={savedTags}
      savedPrompt={room.autoDjPrompt ?? ''}
      onApply={handleApply}
      candidates={candidates.map((c) => ({
        id: c.id,
        name: c.name,
        artist: c.artist,
        thumbnail: c.thumbnail,
        pinned: c.pinned,
      }))}
      onPin={handlePin}
      onSkip={handleSkip}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      aiDisabled={!config?.aiDj}
    />
  );
}
