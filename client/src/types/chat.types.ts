export interface ChatMessage {
  userId: string;
  nickname: string;
  message: string;
  timestamp: string;
  type?: 'chat' | 'system';
  role?: string;
  data?: { nickname?: string; trackName?: string };
}

export interface FloatingReaction {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

export interface SystemMessage {
  event: string;
  detail: string;
}
