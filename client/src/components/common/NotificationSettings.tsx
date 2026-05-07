'use client';

import { Bell, BellOff, BellRing, Loader2, Share } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { usePushControllerGetSettings } from '@/api/push/push';
import { pushControllerUpdateSettings } from '@/api/push/push';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Switch } from '@/components/ui/switch';
import { registerPushSubscription } from '@/hooks/usePushSubscription';
import { cn } from '@/lib/utils';

type ToggleableKey = 'trackChanged' | 'voteSkip' | 'hostChanged' | 'mention';
const TOGGLEABLE_KEYS: { key: ToggleableKey; label: string }[] = [
  { key: 'trackChanged', label: 'events.trackChanged' },
  { key: 'voteSkip', label: 'events.voteSkipPassed' },
  { key: 'hostChanged', label: 'events.hostChanged' },
];

/** iOS Safari 브라우저 감지 (standalone PWA 제외) */
function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = 'standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone;
  return isIos && !isStandalone;
}

interface NotificationSettingsProps {
  roomId?: string;
}

export function NotificationSettings({ roomId: _roomId }: NotificationSettingsProps) {
  const t = useTranslations('notificationSettings');
  const { data: settings, refetch } = usePushControllerGetSettings();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [registering, setRegistering] = useState(false);
  const [needsPwa, setNeedsPwa] = useState(false);

  useEffect(() => {
    // iOS Safari(비-standalone)에서는 Notification API 자체가 없음
    if (typeof Notification === 'undefined') {
      if (isIosSafari()) setNeedsPwa(true);
      return;
    }
    setPermission(Notification.permission);
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && typeof Notification !== 'undefined') {
        setPermission(Notification.permission);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      setRegistering(true);
      await registerPushSubscription();
      setRegistering(false);
    }
  }, []);

  const handleToggle = useCallback(
    async (key: ToggleableKey) => {
      if (!settings) return;
      await pushControllerUpdateSettings({ [key]: !settings[key] });
      refetch();
    },
    [settings, refetch],
  );

  const disabled = needsPwa || permission !== 'granted';

  return (
    <div className="space-y-3">
      {needsPwa && (
        <Surface variant="elevated" padding="sm">
          <div className="flex items-start gap-2 text-xs text-sa-text-muted">
            <Share size={14} className="mt-0.5 shrink-0" />
            <span>{t('iosAddToHome')}</span>
          </div>
        </Surface>
      )}
      {!needsPwa && permission === 'denied' && (
        <Surface variant="danger" padding="sm">
          <div className="flex items-center gap-2 text-xs text-red-400">
            <BellOff size={14} />
            <span>{t('permissionDenied')}</span>
          </div>
        </Surface>
      )}
      {!needsPwa && permission === 'default' && (
        <Surface variant="elevated" padding="sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-sa-text-muted">
              <Bell size={14} />
              <span>{t('permissionDefault')}</span>
            </div>
            <Button variant="accent" size="sm" onClick={requestPermission}>
              {t('allow')}
            </Button>
          </div>
        </Surface>
      )}
      {permission === 'granted' && (
        <>
          <div className="flex items-center gap-2 px-1 text-xs text-green-400">
            {registering ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />}
            <span>{registering ? t('registering') : t('permissionGranted')}</span>
          </div>
          <p className="mt-1 px-1 text-[10px] text-sa-text-muted">{t('osHint')}</p>
        </>
      )}

      <div className={cn(disabled && 'pointer-events-none opacity-50')}>
        {TOGGLEABLE_KEYS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between px-1 py-2">
            <span className="text-sm text-sa-text-secondary">{t(label as 'events.trackChanged')}</span>
            <Switch checked={settings?.[key] ?? true} onCheckedChange={() => handleToggle(key)} />
          </div>
        ))}
      </div>
    </div>
  );
}
