'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { roomsControllerJoin, roomsControllerLeave } from '@/api/rooms/rooms';
import { queryKeys } from '@/hooks/useQueries';

interface UseRoomSetupOptions {
  roomId: string;
  roomName?: string;
  goneRef: React.RefObject<boolean>;
}

export function useRoomSetup({ roomId, roomName, goneRef }: UseRoomSetupOptions) {
  const t = useTranslations('room');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [needPassword, setNeedPassword] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const joinRoom = useCallback(
    async (pw?: string) => {
      try {
        await roomsControllerJoin(roomId, { password: pw });
        setNeedPassword(false);
      } catch (e: unknown) {
        const err = e as { response?: { status: number } };
        if (err.response?.status === 403) setNeedPassword(true);
      }
    },
    [roomId],
  );

  useEffect(() => {
    goneRef.current = false;
    const id = setTimeout(joinRoom, 0);
    return () => clearTimeout(id);
  }, [joinRoom, goneRef]);

  const handleLeave = async () => {
    goneRef.current = true;
    try {
      await roomsControllerLeave(roomId);
    } catch {
      /* ignore */
    }
    queryClient.removeQueries({ queryKey: queryKeys.room(roomId) });
    queryClient.removeQueries({ queryKey: queryKeys.queue(roomId) });
    queryClient.removeQueries({ queryKey: queryKeys.player(roomId) });
    router.push('/rooms');
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/rooms/${roomId}?invite=1`;
    if (navigator.share) {
      try {
        await navigator.share({ title: roomName ?? 'ShareAux', url });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard?.writeText(url);
      toast.success(t('linkCopied'));
    }
  };

  return {
    needPassword,
    showSettings,
    setShowSettings,
    showLeaveConfirm,
    setShowLeaveConfirm,
    joinRoom,
    handleLeave,
    handleShare,
  };
}
