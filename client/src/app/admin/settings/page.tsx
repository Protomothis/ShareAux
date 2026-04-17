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
    title: '인증',
    icon: '🔐',
    items: [
      { key: 'auth.guestEnabled', label: '게스트 로그인', description: '게스트 계정 허용 여부', type: 'boolean' },
      { key: 'auth.googleEnabled', label: 'Google OAuth', description: 'Google 로그인 허용 여부', type: 'boolean' },
      {
        key: 'auth.guestMaxAge',
        label: '게스트 만료 시간 (시간)',
        description: '게스트 계정 자동 만료까지의 시간',
        type: 'number',
        min: 1,
        max: 720,
      },
    ],
  },
  {
    title: '방',
    icon: '🚪',
    items: [
      {
        key: 'room.maxMembers',
        label: '최대 인원',
        description: '방당 최대 참여 인원',
        type: 'number',
        min: 2,
        max: 100,
      },
      {
        key: 'room.maxRoomsPerUser',
        label: '유저당 최대 방',
        description: '한 유저가 생성할 수 있는 최대 방 수',
        type: 'number',
        min: 1,
        max: 10,
      },
    ],
  },
  {
    title: 'AutoDJ',
    icon: '🤖',
    items: [{ key: 'autodj.enabled', label: 'AutoDJ 활성화', description: '자동 DJ 기능 허용', type: 'boolean' }],
  },
  {
    title: '큐',
    icon: '📋',
    items: [
      {
        key: 'queue.maxPerUser',
        label: '유저당 최대 큐',
        description: '한 유저가 추가할 수 있는 최대 큐 수',
        type: 'number',
        min: 1,
        max: 50,
      },
      {
        key: 'queue.maxDuration',
        label: '최대 트랙 길이 (분)',
        description: '큐에 추가 가능한 최대 트랙 길이',
        type: 'number',
        min: 1,
        max: 60,
      },
    ],
  },
  {
    title: '스트리밍',
    icon: '🎵',
    items: [
      {
        key: 'stream.maxBitrateEnabled',
        label: '최대 비트레이트 제한',
        description: '활성화 시 원본이 설정값보다 높으면 제한',
        type: 'boolean',
      },
      {
        key: 'stream.maxBitrate',
        label: '최대 비트레이트 (kbps)',
        description: '원본 비트레이트가 이 값을 초과하면 트랜스코딩',
        type: 'number',
        min: 64,
        max: 320,
      },
    ],
  },
  {
    title: '번역',
    icon: '🌐',
    items: [
      { key: 'translation.enabled', label: '번역 기능', description: '가사 자동 번역 활성화', type: 'boolean' },
      {
        key: 'translation.dailyLimit',
        label: '일일 한도',
        description: '하루 최대 번역 요청 수',
        type: 'number',
        min: 10,
        max: 1000,
      },
      {
        key: 'translation.model',
        label: 'Gemini 모델',
        description: 'flash-lite (빠름) / flash (정확)',
        type: 'string',
      },
    ],
  },
];

export default function AdminSettingsPage() {
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
    updateSettings.mutate({ data: { settings: changed } }, { onSuccess: () => toast.success('설정이 저장되었습니다') });
  }, [draft, settings, updateSettings]);

  if (isLoading) {
    return (
      <div>
        <AdminPageHeader title="⚙️ 시스템 설정" />
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
      <AdminPageHeader title="⚙️ 시스템 설정">
        <Button onClick={handleSave} disabled={!hasChanges || updateSettings.isPending} variant="accent" size="sm">
          {updateSettings.isPending ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : (
            <Save size={14} className="mr-1.5" />
          )}
          저장
        </Button>
      </AdminPageHeader>

      <div className="space-y-6">
        {CATEGORIES.map((cat) => (
          <section key={cat.title} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
            <h3 className="mb-4 text-sm font-medium text-white">
              {cat.icon} {cat.title}
            </h3>
            <div className="space-y-4">
              {cat.items.map((item) => {
                const val = draft[item.key] ?? '';
                if (item.type === 'boolean') {
                  return (
                    <FormField key={item.key} label={item.label} description={item.description} inline>
                      <Switch checked={val === 'true'} onCheckedChange={(v) => setValue(item.key, String(v))} />
                    </FormField>
                  );
                }
                if (item.type === 'number') {
                  return (
                    <FormField key={item.key} label={item.label} description={item.description} inline>
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
                  <FormField key={item.key} label={item.label} description={item.description}>
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
