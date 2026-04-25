// ─── ShareAux Service Worker ─── Push 알림 수신 + 액션 핸들링 ───
const SW_VERSION = '0.1.10';

// ─── i18n 헬퍼 ───

let messagesCache = null;
let cachedLocale = null;

/** locale 기반 messages JSON 로드 (캐싱) */
async function loadMessages(locale) {
  if (messagesCache && cachedLocale === locale) return messagesCache;
  try {
    const res = await fetch(`/messages/${locale}.json`);
    messagesCache = await res.json();
    cachedLocale = locale;
  } catch {
    messagesCache = {};
  }
  return messagesCache;
}

/** 중첩 객체에서 dot path로 값 조회 — 'notification.test.title' */
function resolve(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

/** 템플릿 문자열의 {key}를 vars 값으로 치환 */
function interpolate(template, vars) {
  if (!template || !vars) return template ?? '';
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v ?? '')), template);
}

// ─── Push 이벤트 수신 ───

self.addEventListener('push', (event) => {
  const payload = event.data?.json();
  if (!payload?.event) return;

  const { event: evt, locale = 'en', data = {}, roomId, tag, icon, image } = payload;

  event.waitUntil(handlePush(evt, locale, data, roomId, tag, icon, image));
});

async function handlePush(evt, locale, data, roomId, tag, icon, image) {
  // 테스트 알림 — 항상 표시 (구독 검증용)
  if (evt === 'test') {
    return showTestNotification(data?.locale ?? locale);
  }

  // 포그라운드 탭이 있으면 silent notification (subscription revoke 방지)
  if (await hasFocusedClient()) {
    if (evt !== 'kicked') {
      return self.registration.showNotification('', { tag: 'silent', silent: true });
    }
  }

  // i18n 기반 알림 표시
  return showLocalizedNotification(evt, locale, data, roomId, tag, icon, image);
}

// ─── 알림 표시 ───

async function showTestNotification(locale) {
  const msgs = await loadMessages(locale);
  const title = resolve(msgs, 'notification.test.title') ?? '🔔 Push Active';
  const body = resolve(msgs, 'notification.test.body') ?? 'Notifications are working!';
  return self.registration.showNotification(title, { body, tag: 'test', icon: '/icon-192.png' });
}

async function showLocalizedNotification(evt, locale, data, roomId, tag, icon, image) {
  const msgs = await loadMessages(locale);
  const title = resolve(msgs, `notification.${evt}.title`) ?? 'ShareAux';
  const body = interpolate(resolve(msgs, `notification.${evt}.body`), data);

  const options = {
    body,
    icon: icon ?? '/icon-192.png',
    image,
    tag: tag ?? `${evt}:${roomId}`,
    renotify: true,
    data: { evt, roomId, data },
  };

  // 곡 변경 시 즐겨찾기 액션 버튼
  if (evt === 'trackChanged') {
    const favLabel = resolve(msgs, 'notification.actions.favorite') ?? '⭐ Favorite';
    options.actions = [{ action: 'favorite', title: favLabel }];
  }

  return self.registration.showNotification(title, options);
}

// ─── 알림 클릭 핸들링 ───

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { data } = event.notification;
  const roomId = data?.roomId;
  const url = roomId ? `/rooms/${roomId}` : '/rooms';

  // 즐겨찾기 액션
  if (event.action === 'favorite' && data?.data?.trackSourceId) {
    event.waitUntil(
      fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: data.data.trackSourceId }),
      }).then(async () => {
        // 클라이언트에 캐시 갱신 알림
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach((c) => c.postMessage({ type: 'favorite-added' }));
      }),
    );
    return;
  }

  // 기본 클릭 — 해당 방 탭 포커스 또는 새 탭
  event.waitUntil(focusOrOpen(url));
});

// ─── 유틸 ───

async function hasFocusedClient() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return clients.some((c) => c.visibilityState === 'visible');
}

async function focusOrOpen(url) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const match = clients.find((c) => new URL(c.url).pathname.includes(url));
  if (match) return match.focus();
  if (clients.length) return clients[0].focus();
}
