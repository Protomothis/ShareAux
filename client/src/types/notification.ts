/** 로컬 Notification 트리거 이벤트 */
export type NotificationEvent = 'trackChanged' | 'voteSkipPassed' | 'hostChanged' | 'kicked';

/** 이벤트별 데이터 타입 */
export interface NotificationDataMap {
  trackChanged: { trackName: string; artist: string | null; thumbnail: string | null };
  voteSkipPassed: Record<string, never>;
  hostChanged: Record<string, never>;
  kicked: Record<string, never>;
}

/** 알림 페이로드 (타입 안전) */
export interface NotificationPayload<E extends NotificationEvent = NotificationEvent> {
  event: E;
  roomId: string;
  data: NotificationDataMap[E];
  tag: string;
}

/** 유저 알림 설정 */
export interface NotificationSettings {
  trackChanged: boolean;
  voteSkipPassed: boolean;
  hostChanged: boolean;
  /** 방별 음소거 roomId Set */
  mutedRooms: string[];
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  trackChanged: true,
  voteSkipPassed: true,
  hostChanged: true,
  mutedRooms: [],
};
