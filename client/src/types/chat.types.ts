import type { SystemChatMessage, WsChatMessageItem } from '@/api/model';

/** 시스템 메시지의 부가 데이터 — `SystemChatMessage`에서 event를 제외한 필드 */
export type SystemChatData = Omit<SystemChatMessage, 'event'>;

/**
 * 클라이언트 전용 (WS binary 파싱 결과 + 렌더링 통합 타입)
 *
 * 사용자 채팅과 시스템 메시지를 통합 렌더링하기 위한 타입.
 * 서버 DTO `WsChatMessageItem`을 확장하여 `type` 판별자와 시스템 이벤트 `data`를 추가.
 */
export interface ChatMessage extends WsChatMessageItem {
  type?: 'chat' | 'system';
  data?: SystemChatData;
}

/** 클라이언트 전용 (플로팅 리액션 애니메이션 상태) */
export interface FloatingReaction {
  id: number;
  x: number;
  y: number;
  emoji: string;
}

/**
 * @deprecated `SystemChatMessage`(서버 DTO)를 직접 사용할 것.
 * @see {@link SystemChatMessage}
 */
export type SystemMessage = SystemChatMessage;
