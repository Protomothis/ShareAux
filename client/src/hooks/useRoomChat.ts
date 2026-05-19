'use client';

import { useCallback } from 'react';

import {
  roomsControllerClearChat,
  roomsControllerKick,
  roomsControllerMuteUser,
  roomsControllerUnban,
  roomsControllerUnmuteUser,
} from '@/api/rooms/rooms';
import { WsOpCode } from '@/lib/constants';

interface UseRoomChatOptions {
  roomId: string;
  userId: string | null;
  nickname: string | null;
  send: (data: Uint8Array) => void;
}

export function useRoomChat({ roomId, userId, nickname, send }: UseRoomChatOptions) {
  const handleSend = useCallback(
    (message: string) => {
      const payload = new TextEncoder().encode(
        JSON.stringify({ userId: userId ?? '', nickname, message, timestamp: new Date().toISOString() }),
      );
      const frame = new Uint8Array(1 + payload.length);
      frame[0] = WsOpCode.Chat;
      frame.set(payload, 1);
      send(frame);
    },
    [send, userId, nickname],
  );

  const handleCommand = useCallback(
    async (command: string, targetUserId?: string) => {
      try {
        switch (command) {
          case 'ban':
            if (targetUserId) await roomsControllerKick(roomId, targetUserId);
            break;
          case 'unban':
            if (targetUserId) await roomsControllerUnban(roomId, targetUserId);
            break;
          case 'mute':
            if (targetUserId) await roomsControllerMuteUser(roomId, targetUserId);
            break;
          case 'unmute':
            if (targetUserId) await roomsControllerUnmuteUser(roomId, targetUserId);
            break;
          case 'clear':
            await roomsControllerClearChat(roomId);
            break;
        }
      } catch {
        /* 에러는 global handler에서 처리 */
      }
    },
    [roomId],
  );

  return { handleSend, handleCommand };
}
