import { PushEvent } from './push-event.enum.js';

/** 이벤트별 data 타입 매핑 */
export interface PushDataMap {
  [PushEvent.TrackChanged]: { trackName: string; artist: string | null };
  [PushEvent.VoteSkipPassed]: Record<string, never>;
  [PushEvent.HostChanged]: Record<string, never>;
  [PushEvent.Kicked]: Record<string, never>;
  [PushEvent.Mention]: { nickname: string; message: string };
}

/** Push 알림용 내부 이벤트 페이로드 (타입 안전) */
export interface PushEventPayload<E extends PushEvent = PushEvent> {
  event: E;
  roomId: string;
  userIds: string[];
  excludeUserId?: string;
  icon?: string;
  image?: string;
  tag: string;
  data: PushDataMap[E];
}

/** NestJS EventEmitter 이벤트 이름 */
export const PUSH_EVENT = 'push.send' as const;

/** 타입 안전 emit 헬퍼 */
export function pushPayload<E extends PushEvent>(event: E, p: Omit<PushEventPayload<E>, 'event'>): PushEventPayload<E> {
  return { event, ...p };
}
