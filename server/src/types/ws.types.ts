import type { WebSocket } from 'ws';

export const enum WsOpCode {
  Audio = 0x01,
  Chat = 0x02,
  System = 0x03,
  Heartbeat = 0x04,
  Resync = 0x05,
  ListenerStatus = 0x06,
  Reaction = 0x07,
  PingMeasure = 0x08,
}

export interface WsClient extends WebSocket {
  data?: {
    userId: string;
    roomId: string;
    nickname: string;
    role: string;
    audioCallback: (frame: Buffer) => void;
    listening?: boolean;
    permissions: import('./permission.enum.js').Permission[];
  };
}

export interface ChatHistoryEntry {
  userId: string;
  nickname: string;
  message: string;
  role?: string;
  timestamp: string;
}
