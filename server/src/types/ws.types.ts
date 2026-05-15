import type { WebSocket } from 'ws';

import type { Permission } from './permission.enum.js';
import type { UserRole } from './user-role.enum.js';

export const enum WsOpCode {
  Audio = 0x01,
  Chat = 0x02,
  System = 0x03,
  Heartbeat = 0x04,
  Resync = 0x05,
  ListenerStatus = 0x06,
  Reaction = 0x07,
  PingMeasure = 0x08,
  ResyncWait = 0x09,
}

export interface WsClient extends WebSocket {
  data?: {
    userId: string;
    roomId: string;
    nickname: string;
    role: UserRole;
    audioCallback: (frame: Buffer) => void;
    listening?: boolean;
    permissions: Permission[];
  };
}

export interface ChatHistoryEntry {
  userId: string;
  nickname: string;
  message: string;
  role?: UserRole;
  timestamp: string;
}
