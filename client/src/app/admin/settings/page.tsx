'use client';

import { Loader2, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import NumberStepper from '@/components/ui/number-stepper';
import { Switch } from '@/components/ui/switch';
import { useAdminSettings, useUpdateSettings } from '@/hooks/admin/useAdminSettings';
import { useTranslations } from 'next-intl';

interface SettingDef {
  key: string;
  label: string;
  description: string;
  type: 'boolean' | 'number' | 'string';
  min?: number;
  max?: number;
}

interface SettingCategory {
  title: string;
  icon: string;
  items: SettingDef[];
}

const CATEGORIES: SettingCategory[] = [
  {
    title: 'authSection',
    icon: '🔐',
    items: [
      { key: 'auth.guestEnabled', label: 'guestLogin', description: 'guestLoginDesc', type: 'boolean' },
      { key: 'auth.googleEnabled', label: 'Google OAuth', description: 'googleOAuthDesc', type: 'boolean' },
      {
        key: 'auth.guestMaxAge',
        label: 'guestExpiry',
        description: 'guestExpiryDesc',
        type: 'number',
        min: 1,
        max: 720,
      },
    ],
  },
  {
    title: 'roomSection',
    icon: '🚪',
    items: [
      {
        key: 'room.maxMembers',
        label: 'maxMembers',
        description: 'maxMembersDesc',
        type: 'number',
        min: 2,
        max: 100,
      },
      {
        key: 'room.maxRoomsPerUser',
        label: 'maxRoomsPerUser',
        description: 'maxRoomsPerUserDesc',
        type: 'number',
        min: 1,
        max: 10,
      },
    ],
  },
  {
    title: 'AutoDJ',
    icon: '🤖',
    items: [{ key: 'autodj.enabled', label: 'autoDjEnabled', description: 'autoDjEnabledDesc', type: 'boolean' }],
  },
  {
    title: 'queueSection',
    icon: '📋',
    items: [
      {
        key: 'queue.maxPerUser',
        label: 'maxQueuePerUser',
        description: 'maxQueuePerUserDesc',
        type: 'number',
        min: 1,
        max: 50,
      },
      {
        key: 'queue.maxDuration',
        label: 'maxTrackLength',
        description: 'maxTrackLengthDesc',
        type: 'number',
        min: 1,
        max: 60,
      },
    ],
  },
  {
    title: 'streamSection',
    icon: '🎵',
    items: [
      {
        key: 'stream.maxBitrateEnabled',
        label: 'maxBitrateEnabled',
        description: 'maxBitrateEnabledDesc',
        type: 'boolean',
      },
      {
        key: 'stream.maxBitrate',
        label: 'maxBitrate',
        description: 'maxBitrateDesc',
        type: 'number',
        min: 64,
        max: 320,
      },
    ],
  },
  {
    title: 'translationSection',
    icon: '🌐',
    items: [
      {
        key: 'translation.enabled',
        label: 'translationEnabled',
        description: 'translationEnabledDesc',
        type: 'boolean',
      },
      {
        key: 'translation.dailyLimit',
        label: 'dailyLimit',
        description: 'dailyLimitDesc',
        type: 'number',
        min: 10,
        max: 1000,
      },
      {
        key: 'translation.model',
        label: 'geminiModel',
        description: 'geminiModelDesc',
        type: 'string',
      },
    ],
  },
];

export default function AdminSettingsPage() {
  const t = useTranslations('admin.settings');
  const { data: settings, isLoading } = useAdminSettings();
  const updateSettings = useUpdateSettings();
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) setDraft(settings as Record<string, string>);
  }, [settings]);

  const hasChanges = useMemo(() => {
    if (!settings) return false;
    const orig = settings as Record<string, string>;
    return Object.keys(draft).some((k) => draft[k] !== orig[k]);
  }, [draft, settings]);

  const setValue = useCallback((key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    if (!settings) return;
    const orig = settings as Record<string, string>;
    const changed: Record<string, string> = {};
    for (const k of Object.keys(draft)) {
      if (draft[k] !== orig[k]) changed[k] = draft[k];
    }
    if (Object.keys(changed).length === 0) return;
    updateSettings.mutate({ data: { settings: changed } }, { onSuccess: () => toast.success(t('saved')) });
  }, [draft, settings, updateSettings]);

  if (isLoading) {
    return (
      <div>
        <AdminPageHeader title={t('title')} />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title={t('title')}>
        <Button onClick={handleSave} disabled={!hasChanges || updateSettings.isPending} variant="accent" size="sm">
          {updateSettings.isPending ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : (
            <Save size={14} className="mr-1.5" />
          )}
          {t('save')}
        </Button>
      </AdminPageHeader>

      <div className="space-y-6">
        {CATEGORIES.map((cat) => (
          <section key={t(cat.title)} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <h3 className="mb-4 text-sm font-medium text-white">
              {cat.icon} {t(cat.title)}
            </h3>
            <div className="space-y-4">
              {cat.items.map((item) => {
                const val = draft[item.key] ?? '';
                if (item.type === 'boolean') {
                  return (
                    <FormField key={item.key} label={t(item.label)} description={t(item.description)} inline>
                      <Switch checked={val === 'true'} onCheckedChange={(v) => setValue(item.key, String(v))} />
                    </FormField>
                  );
                }
                if (item.type === 'number') {
                  return (
                    <FormField key={item.key} label={t(item.label)} description={t(item.description)} inline>
                      <NumberStepper
                        value={Number(val) || 0}
                        onChange={(v) => setValue(item.key, String(v))}
                        min={item.min}
                        max={item.max}
                        size="sm"
                      />
                    </FormField>
                  );
                }
                return (
                  <FormField key={item.key} label={t(item.label)} description={t(item.description)}>
                    <Input value={val} onChange={(e) => setValue(item.key, e.target.value)} />
                  </FormField>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
