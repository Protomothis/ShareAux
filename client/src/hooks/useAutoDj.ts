'use client';

import { useCallback, useState } from 'react';

import { useAuthControllerGetAuthConfig } from '@/api/auth/auth';
import type { AutoDjCandidateItem, AutoDjCandidatesResponse } from '@/api/model';
import {
  roomsControllerPinAutoDjCandidate,
  roomsControllerRefreshAutoDjPool,
  roomsControllerSkipAutoDjCandidate,
  roomsControllerToggleAutoDjPause,
  roomsControllerUpdate,
  useRoomsControllerGetAutoDjCandidates,
} from '@/api/rooms/rooms';

import type { CandidateTrack } from '@/components/queue/AutoDjCandidates';
import type { AutoDjMode } from '@/components/queue/AutoDjModeSelect';
import type { AutoDjTags } from '@/components/queue/AutoDjTagFilter';

interface UseAutoDjOptions {
  roomId: string;
  enabled: boolean;
  isHost: boolean;
  mode: string;
  paused: boolean;
  tags: Record<string, string[]> | null;
  prompt: string | null;
}

export function useAutoDj({ roomId, enabled, isHost, mode, paused, tags, prompt }: UseAutoDjOptions) {
  const [refreshing, setRefreshing] = useState(false);
  const { data: config } = useAuthControllerGetAuthConfig();
  const { data: candidatesData, refetch } = useRoomsControllerGetAutoDjCandidates(roomId, {
    query: { enabled },
  });

  const candidates: CandidateTrack[] = ((candidatesData as AutoDjCandidatesResponse | undefined)?.candidates ?? []).map(
    (c: AutoDjCandidateItem) => ({
      id: c.id,
      name: c.name,
      artist: c.artist,
      thumbnail: c.thumbnail,
      pinned: c.pinned,
    }),
  );

  const handleModeChange = useCallback(
    (m: AutoDjMode) => {
      if (!isHost) return;
      roomsControllerUpdate(roomId, { autoDjMode: m });
    },
    [roomId, isHost],
  );

  const handleApply = useCallback(
    async (t: AutoDjTags, p: string) => {
      if (!isHost) return;
      await roomsControllerUpdate(roomId, { autoDjTags: t, autoDjPrompt: p });
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

  const savedTags: AutoDjTags = (tags as AutoDjTags | null) ?? { mood: [], genre: [], era: [], country: [] };

  return {
    mode: mode as AutoDjMode,
    paused,
    savedTags,
    savedPrompt: prompt ?? '',
    candidates,
    refreshing,
    aiDisabled: !config?.aiDj,
    onModeChange: handleModeChange,
    onApply: handleApply,
    onRefresh: handleRefresh,
    onPin: handlePin,
    onSkip: handleSkip,
    onTogglePause: handleTogglePause,
  };
}
