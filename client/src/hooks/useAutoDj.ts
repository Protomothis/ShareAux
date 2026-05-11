'use client';

import { useCallback, useState } from 'react';

import { useAuthControllerGetAuthConfig } from '@/api/auth/auth';
import type { AutoDjCandidateItem, AutoDjCandidatesResponse, AutoDjTagsDto } from '@/api/model';
import {
  roomsControllerEnqueueAutoDjCandidate,
  roomsControllerPinAutoDjCandidate,
  roomsControllerRefreshAutoDjPool,
  roomsControllerSkipAutoDjCandidate,
  roomsControllerToggleAutoDjPause,
  roomsControllerUpdate,
  useRoomsControllerGetAutoDjCandidates,
} from '@/api/rooms/rooms';

import type { CandidateTrack } from '@/components/queue/AutoDjCandidates';
import type { AutoDjMode } from '@/components/queue/AutoDjModeSelect';

const EMPTY_TAGS = { mood: [], genre: [], era: [], country: [], taste: 'neutral' };

interface UseAutoDjOptions {
  roomId: string;
  enabled: boolean;
  isHost: boolean;
  mode: string;
  paused: boolean;
  tags: AutoDjTagsDto | null;
  prompt: string | null;
}

export function useAutoDj({ roomId, enabled, isHost, mode, paused, tags, prompt }: UseAutoDjOptions) {
  const [refreshing, setRefreshing] = useState(false);
  const { data: config } = useAuthControllerGetAuthConfig();
  const {
    data: candidatesData,
    refetch,
    isLoading: candidatesLoading,
  } = useRoomsControllerGetAutoDjCandidates(roomId, {
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
    async (t: AutoDjTagsDto, p: string) => {
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

  const handleEnqueue = useCallback(
    async (trackId: string) => {
      await roomsControllerEnqueueAutoDjCandidate(roomId, trackId);
      refetch();
    },
    [roomId, refetch],
  );

  const handleTogglePause = useCallback(async () => {
    await roomsControllerToggleAutoDjPause(roomId);
  }, [roomId]);

  const savedTags = { taste: 'neutral', ...(tags ?? EMPTY_TAGS) };

  return {
    mode: mode as AutoDjMode,
    paused,
    savedTags,
    candidates,
    candidatesLoading,
    refreshing,
    aiDisabled: !config?.aiDj,
    onModeChange: handleModeChange,
    onApply: handleApply,
    onRefresh: handleRefresh,
    onPin: handlePin,
    onSkip: handleSkip,
    onEnqueue: handleEnqueue,
    onTogglePause: handleTogglePause,
  };
}
