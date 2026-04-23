'use client';

import { Loader2, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import {
  getAdminControllerGetSecretsQueryKey,
  useAdminControllerGetGeminiModels,
  useAdminControllerGetSecrets,
} from '@/api/admin/admin';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { BoolField, NumField, SecretSection, SelectField, SettingSection } from '@/components/admin/settings';
import { Button } from '@/components/ui/button';
import { useAdminSettings, useUpdateSettings } from '@/hooks/admin/useAdminSettings';
import { SkeletonCard, SkeletonLine } from '@/components/ui/skeleton';

export default function AdminSettingsPage() {
  const t = useTranslations('admin.settings');
  const qc = useQueryClient();
  const { data: settings, isLoading } = useAdminSettings();
  const updateSettings = useUpdateSettings();
  const { data: geminiData } = useAdminControllerGetGeminiModels();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [pendingSecrets, setPendingSecrets] = useState<Record<string, string>>({});

  const values = useMemo(() => (settings ?? {}) as Record<string, string>, [settings]);
  const geminiModels = useMemo(() => {
    const d = geminiData as unknown as { models?: string[] } | undefined;
    return d?.models ?? [];
  }, [geminiData]);

  // 시크릿 상태 → 의존 옵션 비활성화
  const { data: secretsData } = useAdminControllerGetSecrets();
  const secrets = useMemo(
    () => (secretsData ?? {}) as Record<string, { masked: string; configured: boolean }>,
    [secretsData],
  );
  const hasGemini = secrets['secret.geminiApiKey']?.configured ?? false;
  const hasGoogle =
    (secrets['secret.googleClientId']?.configured ?? false) &&
    (secrets['secret.googleClientSecret']?.configured ?? false);
  const translationOn = draft['translation.enabled'] === 'true';

  useEffect(() => {
    if (Object.keys(values).length) setDraft(values);
  }, [values]);

  const hasChanges = useMemo(
    () => Object.keys(draft).some((k) => draft[k] !== values[k]) || Object.keys(pendingSecrets).length > 0,
    [draft, values, pendingSecrets],
  );

  const set = useCallback((key: string, value: string) => {
    setDraft((p) => ({ ...p, [key]: value }));
  }, []);

  const handleSecretChange = useCallback((key: string, value: string) => {
    setPendingSecrets((p) => ({ ...p, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    const changed: Record<string, string> = {};
    for (const k of Object.keys(draft)) {
      if (draft[k] !== values[k]) changed[k] = draft[k];
    }
    Object.assign(changed, pendingSecrets);
    if (!Object.keys(changed).length) return;
    updateSettings.mutate(
      { data: { settings: changed } },
      {
        onSuccess: () => {
          toast.success(t('saved'));
          setPendingSecrets({});
          void qc.invalidateQueries({ queryKey: getAdminControllerGetSecretsQueryKey() });
        },
      },
    );
  }, [draft, values, pendingSecrets, updateSettings, t, qc]);

  if (isLoading) {
    return (
      <div>
        <AdminPageHeader title={t('title')} />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="h-32" />
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
        <SecretSection onSecretChange={handleSecretChange} />

        <SettingSection icon="🔐" title={t('authSection')}>
          <BoolField
            label={t('guestLogin')}
            description={t('guestLoginDesc')}
            value={draft['auth.guestEnabled'] ?? ''}
            onChange={(v) => set('auth.guestEnabled', v)}
          />
          <BoolField
            label={t('googleOAuth')}
            description={t('googleOAuthDesc')}
            value={draft['auth.googleEnabled'] ?? ''}
            onChange={(v) => set('auth.googleEnabled', v)}
            disabled={!hasGoogle}
            disabledReason={t('requireGoogleKey')}
          />
          <NumField
            label={t('guestExpiry')}
            description={t('guestExpiryDesc')}
            value={draft['auth.guestMaxAge'] ?? ''}
            onChange={(v) => set('auth.guestMaxAge', v)}
            min={1}
            max={720}
          />
          <BoolField
            label={t('captchaEnabled')}
            description={t('captchaEnabledDesc')}
            value={draft['captcha.enabled'] ?? ''}
            onChange={(v) => set('captcha.enabled', v)}
          />
        </SettingSection>

        <SettingSection icon="🚪" title={t('roomSection')}>
          <NumField
            label={t('maxMembers')}
            description={t('maxMembersDesc')}
            value={draft['room.maxMembers'] ?? ''}
            onChange={(v) => set('room.maxMembers', v)}
            min={2}
            max={100}
          />
          <NumField
            label={t('maxRoomsPerUser')}
            description={t('maxRoomsPerUserDesc')}
            value={draft['room.maxRoomsPerUser'] ?? ''}
            onChange={(v) => set('room.maxRoomsPerUser', v)}
            min={1}
            max={10}
          />
        </SettingSection>

        <SettingSection icon="🤖" title={t('autodjSection')}>
          <BoolField
            label={t('autoDjEnabled')}
            description={t('autoDjEnabledDesc')}
            value={draft['autodj.enabled'] ?? ''}
            onChange={(v) => set('autodj.enabled', v)}
          />
        </SettingSection>

        <SettingSection icon="📋" title={t('queueSection')}>
          <NumField
            label={t('maxQueuePerUser')}
            description={t('maxQueuePerUserDesc')}
            value={draft['queue.maxPerUser'] ?? ''}
            onChange={(v) => set('queue.maxPerUser', v)}
            min={1}
            max={50}
          />
          <NumField
            label={t('maxTrackLength')}
            description={t('maxTrackLengthDesc')}
            value={draft['queue.maxDuration'] ?? ''}
            onChange={(v) => set('queue.maxDuration', v)}
            min={1}
            max={60}
          />
        </SettingSection>

        <SettingSection icon="🎵" title={t('streamSection')}>
          <BoolField
            label={t('maxBitrateEnabled')}
            description={t('maxBitrateEnabledDesc')}
            value={draft['stream.maxBitrateEnabled'] ?? ''}
            onChange={(v) => set('stream.maxBitrateEnabled', v)}
          />
          <NumField
            label={t('maxBitrate')}
            description={t('maxBitrateDesc')}
            value={draft['stream.maxBitrate'] ?? ''}
            onChange={(v) => set('stream.maxBitrate', v)}
            min={64}
            max={320}
          />
        </SettingSection>

        <SettingSection icon="🌐" title={t('translationSection')}>
          <BoolField
            label={t('translationEnabled')}
            description={t('translationEnabledDesc')}
            value={draft['translation.enabled'] ?? ''}
            onChange={(v) => set('translation.enabled', v)}
            disabled={!hasGemini}
            disabledReason={t('requireGeminiKey')}
          />
          <NumField
            label={t('dailyLimit')}
            description={t('dailyLimitDesc')}
            value={draft['translation.dailyLimit'] ?? ''}
            onChange={(v) => set('translation.dailyLimit', v)}
            min={10}
            max={1000}
            disabled={!hasGemini || !translationOn}
            disabledReason={!hasGemini ? t('requireGeminiKey') : t('requireTranslation')}
          />
          <SelectField
            label={t('geminiModel')}
            description={t('geminiModelDesc')}
            value={draft['translation.model'] ?? ''}
            onChange={(v) => set('translation.model', v)}
            options={geminiModels}
            disabled={!hasGemini || !translationOn}
            disabledReason={!hasGemini ? t('requireGeminiKey') : t('requireTranslation')}
          />
        </SettingSection>
      </div>
    </div>
  );
}
