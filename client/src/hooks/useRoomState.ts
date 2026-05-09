'use client';
import { useState } from 'react';

import type { AutoDjStatus, TrackVoteMap } from '@/types';

/**
 * useRoomState — 방 부가 상태 관리
 * votes, listeners, autoDj, mute 등 재생과 직접 관련 없는 방 상태.
 */
export function useRoomState() {
  const [skipVotes, setSkipVotes] = useState(0);
  const [skipRequired, setSkipRequired] = useState(1);
  const [listenerCount, setListenerCount] = useState(0);
  const [trackVotes, setTrackVotes] = useState<TrackVoteMap>(new Map());
  const [autoDjStatus, setAutoDjStatus] = useState<AutoDjStatus>('idle');
  const [mutedUntil, setMutedUntil] = useState(0);

  return {
    skipVotes,
    setSkipVotes,
    skipRequired,
    setSkipRequired,
    listenerCount,
    setListenerCount,
    trackVotes,
    setTrackVotes,
    autoDjStatus,
    setAutoDjStatus,
    mutedUntil,
    setMutedUntil,
  };
}
