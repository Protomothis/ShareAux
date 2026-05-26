'use client';

import { useTranslations } from 'next-intl';

import { BoolField, NumField, SelectField, SettingSection } from '@/components/admin/settings';

interface AiDjSettingsProps {
  draft: Record<string, string>;
  set: (key: string, value: string) => void;
  hasGemini: boolean;
  geminiModels?: string[];
}

const FALLBACK_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];

export function AiDjSettings({ draft, set, hasGemini, geminiModels }: AiDjSettingsProps) {
  const t = useTranslations('admin.settings');
  const aiDjOn = draft['autodj.aiEnabled'] === 'true';
  const disabled = !hasGemini || !aiDjOn;
  const modelOptions = geminiModels?.length ? geminiModels : FALLBACK_MODELS;

  return (
    <SettingSection icon="🤖" title={t('aiDjSection')}>
      <BoolField
        label={t('aiDjEnabled')}
        description={t('aiDjEnabledDesc')}
        value={draft['autodj.aiEnabled'] ?? ''}
        onChange={(v) => set('autodj.aiEnabled', v)}
        disabled={!hasGemini}
        disabledReason={t('requireGeminiKey')}
      />
      <SelectField
        label={t('aiDjModel')}
        description={t('aiDjModelDesc')}
        value={draft['autodj.aiModel'] ?? ''}
        onChange={(v) => set('autodj.aiModel', v)}
        options={modelOptions}
        disabled={disabled}
        disabledReason={!hasGemini ? t('requireGeminiKey') : t('requireAiDj')}
      />
      <NumField
        label={t('aiDjBatchSize')}
        description={t('aiDjBatchSizeDesc')}
        value={draft['autodj.batchSize'] ?? ''}
        onChange={(v) => set('autodj.batchSize', v)}
        min={5}
        max={30}
        disabled={disabled}
        disabledReason={!hasGemini ? t('requireGeminiKey') : t('requireAiDj')}
      />
      <NumField
        label={t('aiDjTemperature')}
        description={t('aiDjTemperatureDesc')}
        value={draft['autodj.temperature'] ?? ''}
        onChange={(v) => set('autodj.temperature', v)}
        min={0.1}
        max={1.5}
        disabled={disabled}
        disabledReason={!hasGemini ? t('requireGeminiKey') : t('requireAiDj')}
      />
    </SettingSection>
  );
}
