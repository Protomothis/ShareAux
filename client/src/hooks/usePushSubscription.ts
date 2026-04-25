'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { pushControllerGetVapidKey, pushControllerSubscribe } from '@/api/push/push';
import { Language } from '@/api/model';

/** Push subscription 등록 (SW 등록 + 서버 전달) */
export async function registerPushSubscription(): Promise<boolean> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  if (!('serviceWorker' in navigator)) return false;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const vapid = await pushControllerGetVapidKey();
    const key = vapid.key;
    if (!key) return false;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
    });

    const json = sub.toJSON();
    const locale = (document.cookie.match(/(?:^|;\s*)locale=(\w+)/)?.[1] ?? navigator.language.slice(0, 2)) as Language;
    await pushControllerSubscribe({
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
      locale: locale === Language.ko ? Language.ko : Language.en,
    });
    return true;
  } catch {
    return false;
  }
}

/** 방 입장 시 자동 구독 (권한 granted 상태면) */
export function usePushSubscription() {
  const subscribedRef = useRef(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (subscribedRef.current) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    subscribedRef.current = true;
    registerPushSubscription();
  }, []);

  // SW에서 favorite-added 메시지 수신 → 캐시 갱신
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'favorite-added') qc.invalidateQueries({ queryKey: ['favorites'] });
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [qc]);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
