import type { ChatMessage, SystemMessage } from './chat.types';

export interface UseWebSocketOptions {
  url: string;
  enabled?: boolean;
  onAudio?: (frame: Uint8Array) => void;
  onChat?: (data: ChatMessage) => void;
  onSystem?: (data: SystemMessage & { data?: Record<string, unknown> }) => void;
  onReaction?: (index: number) => void;
  onReconnect?: () => void;
  /** 오디오 버퍼 클리어 + init segment 대기 상태로 전환 */
  prepareResync?: () => Promise<void>;
  /** 토큰 만료 시 새 URL을 반환하는 콜백. 반환 시 자동 재연결 */
  onTokenExpired?: () => Promise<string | null>;
}
