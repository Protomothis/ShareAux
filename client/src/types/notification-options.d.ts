/** showNotification 확장 옵션 — 브라우저 지원하지만 TS 타입에 누락된 필드 */
interface ExtendedNotificationOptions extends NotificationOptions {
  renotify?: boolean;
  image?: string;
  actions?: { action: string; title: string; icon?: string }[];
}
