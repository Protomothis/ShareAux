'use client';

import type { Room } from '@/api/model';
import { useAutoDj } from '@/hooks/useAutoDj';

import { AutoDjTab } from './AutoDjTab';

interface MobileAutoDjTabProps {
  roomId: string;
  room: Room;
  isHost: boolean;
}

export function MobileAutoDjTab({ roomId, room, isHost }: MobileAutoDjTabProps) {
  const autoDj = useAutoDj({
    roomId,
    enabled: true,
    isHost,
    mode: room.autoDjMode,
    paused: room.autoDjPaused,
    tags: room.autoDjTags ?? null,
    prompt: room.autoDjPrompt ?? null,
  });

  return <AutoDjTab {...autoDj} />;
}
