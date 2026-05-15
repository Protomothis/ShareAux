'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useAuthControllerGetAuthConfig } from '@/api/auth/auth';
import {
  autoDjControllerEnqueue,
  autoDjControllerPin,
  autoDjControllerRefresh,
  autoDjControllerSkip,
  autoDjControllerTogglePause,
  getAutoDjControllerGetCandidatesQueryKey,
  useAutoDjControllerGetCandidates,
} from '@/api/auto-d-j/auto-d-j';
import type { AutoDjCandidateItem, AutoDjCandidatesResponse, AutoDjTagsDto } from '@/api/model';
import { roomsControllerUpdate } from '@/api/rooms/rooms';

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
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { data: config } = useAuthControllerGetAuthConfig();
  const {
    data: candidatesData,
    refetch,
    isLoading: candidatesLoading,
  } = useAutoDjControllerGetCandidates(roomId, {
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
      await autoDjControllerRefresh(roomId);
      await refetch();
      setRefreshing(false);
    },
    [roomId, isHost, refetch],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await autoDjControllerRefresh(roomId);
    await refetch();
    setRefreshing(false);
  }, [roomId, refetch]);

  const removeFromCache = useCallback(
    (trackId: string) => {
      queryClient.setQueryData(
        getAutoDjControllerGetCandidatesQueryKey(roomId),
        (old: AutoDjCandidatesResponse | undefined) => {
          if (!old) return old;
          return { candidates: old.candidates.filter((c: AutoDjCandidateItem) => c.id !== trackId) };
        },
      );
    },
    [queryClient, roomId],
  );

  const handlePin = useCallback(
    async (trackId: string) => {
      await autoDjControllerPin(roomId, trackId);
      refetch();
    },
    [roomId, refetch],
  );

  const handleSkip = useCallback(
    async (trackId: string) => {
      removeFromCache(trackId);
      await autoDjControllerSkip(roomId, trackId);
    },
    [roomId, removeFromCache],
  );

  const handleEnqueue = useCallback(
    async (trackId: string) => {
      removeFromCache(trackId);
      await autoDjControllerEnqueue(roomId, trackId);
    },
    [roomId, removeFromCache],
  );

  const handleTogglePause = useCallback(async () => {
    await autoDjControllerTogglePause(roomId);
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
