'use client';
import { useCallback, useRef, useState } from 'react';

import { AutoDjStatus } from '@/api/model';
import type { TrackVoteMap } from '@/types';

const AUTODJ_STATUS_MIN_DISPLAY_MS = 2000;

/**
 * useRoomState — 방 부가 상태 관리
 * votes, listeners, autoDj, mute 등 재생과 직접 관련 없는 방 상태.
 */
export function useRoomState() {
  const [skipVotes, setSkipVotes] = useState(0);
  const [skipRequired, setSkipRequired] = useState(1);
  const [listenerCount, setListenerCount] = useState(0);
  const [trackVotes, setTrackVotes] = useState<TrackVoteMap>(new Map());
  const [autoDjStatus, setAutoDjStatusRaw] = useState<AutoDjStatus>(AutoDjStatus.idle);
  const [mutedUntil, setMutedUntil] = useState(0);

  const activeAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setAutoDjStatus = useCallback((status: AutoDjStatus) => {
    if (status !== AutoDjStatus.idle) {
      activeAtRef.current = Date.now();
      if (timerRef.current) clearTimeout(timerRef.current);
      setAutoDjStatusRaw(status);
    } else {
      const elapsed = Date.now() - activeAtRef.current;
      const remaining = AUTODJ_STATUS_MIN_DISPLAY_MS - elapsed;
      if (remaining <= 0) {
        setAutoDjStatusRaw(AutoDjStatus.idle);
      } else {
        timerRef.current = setTimeout(() => setAutoDjStatusRaw(AutoDjStatus.idle), remaining);
      }
    }
  }, []);

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
