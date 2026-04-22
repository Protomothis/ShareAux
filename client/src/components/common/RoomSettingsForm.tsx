'use client';

import { FormField, FormSection } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import NumberStepper from '@/components/ui/number-stepper';
import { SettingCard } from '@/components/ui/setting-card';
import type { AutoDjMode } from '@/types';

import AutoDjSettings from './AutoDjSettings';

export interface RoomFormValues {
  name: string;
  maxMembers: number;
  isPrivate: boolean;
  password: string;
  crossfade: boolean;
  defaultEnqueueEnabled: boolean;
  defaultVoteSkipEnabled: boolean;
  maxSelectPerAdd: number;
  replayCooldownMin: number;
  autoDjEnabled: boolean;
  autoDjMode: AutoDjMode;
  autoDjThreshold: number;
  autoDjFolderId: string | null;
  autoDjFavFallbackMixed: boolean;
  enqueueWindowMin: number;
  enqueueLimitPerWindow: number;
}

export const DEFAULT_FORM_VALUES: RoomFormValues = {
  name: '',
  maxMembers: 10,
  isPrivate: false,
  password: '',
  crossfade: true,
  defaultEnqueueEnabled: true,
  defaultVoteSkipEnabled: true,
  maxSelectPerAdd: 3,
  replayCooldownMin: 0,
  autoDjEnabled: false,
  autoDjMode: 'related',
  autoDjThreshold: 2,
  autoDjFolderId: null,
  autoDjFavFallbackMixed: false,
  enqueueWindowMin: 30,
  enqueueLimitPerWindow: 15,
};

interface RoomSettingsFormProps {
  mode: 'create' | 'edit';
  values: RoomFormValues;
  onChange: <K extends keyof RoomFormValues>(key: K, value: RoomFormValues[K]) => void;
  errors?: Partial<Record<keyof RoomFormValues, string>>;
  onClearError?: (field: keyof RoomFormValues) => void;
}

export default function RoomSettingsForm({
  mode,
  values: v,
  onChange: set,
  errors,
  onClearError,
}: RoomSettingsFormProps) {
  const change = <K extends keyof RoomFormValues>(key: K, value: RoomFormValues[K]) => {
    onClearError?.(key);
    set(key, value);
  };

  const t = useTranslations('settings');

  return (
    <div className="space-y-5">
      {/* ─── 기본 정보 ─── */}
      <FormSection title={t('basicInfo')}>
        <FormField label={t('roomName')} htmlFor="name" error={errors?.name}>
          <Input
            id="name"
            value={v.name}
            onChange={(e) => change('name', e.target.value)}
            placeholder={t('roomNamePlaceholder')}
            autoFocus={mode === 'create'}
          />
        </FormField>
        {mode === 'create' && (
          <>
            <FormField label={t('maxMembers')} error={errors?.maxMembers}>
              <NumberStepper
                size="sm"
                value={v.maxMembers}
                onChange={(n) => change('maxMembers', n)}
                min={2}
                max={50}
              />
            </FormField>
            <SettingCard
              icon="🔒"
              label={t('privateRoom')}
              htmlFor="isPrivate"
              checked={v.isPrivate}
              onCheckedChange={(c) => change('isPrivate', c)}
            >
              <Input
                type="password"
                value={v.password}
                onChange={(e) => change('password', e.target.value)}
                placeholder={t('passwordPlaceholder')}
              />
              {errors?.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
            </SettingCard>
          </>
        )}
      </FormSection>

      {/* ─── 권한 & 재생 ─── */}
      <FormSection title={t('playback')}>
        <div className="grid gap-2 sm:grid-cols-2">
          <SettingCard
            icon="🔀"
            label={t('crossfade')}
            description={t('crossfadeDesc')}
            htmlFor="crossfade"
            checked={v.crossfade}
            onCheckedChange={(c) => change('crossfade', c)}
          />
          <SettingCard
            icon="🎵"
            label={t('enqueueDefault')}
            description={t('enqueueDefaultDesc')}
            htmlFor="defaultEnqueue"
            checked={v.defaultEnqueueEnabled}
            onCheckedChange={(c) => change('defaultEnqueueEnabled', c)}
          />
          <SettingCard
            icon="⏭️"
            label={t('voteSkipDefault')}
            description={t('enqueueDefaultDesc')}
            htmlFor="defaultVoteSkip"
            checked={v.defaultVoteSkipEnabled}
            onCheckedChange={(c) => change('defaultVoteSkipEnabled', c)}
          />
        </div>
      </FormSection>

      {/* ─── 곡 신청 ─── */}
      <FormSection title={t('enqueueSection')}>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label={t('maxSelectPerAdd')} error={errors?.maxSelectPerAdd}>
            <NumberStepper
              size="sm"
              value={v.maxSelectPerAdd}
              onChange={(n) => change('maxSelectPerAdd', n)}
              min={1}
              max={10}
            />
          </FormField>
          <FormField label={t('enqueueWindowMin')} error={errors?.enqueueWindowMin}>
            <NumberStepper
              size="sm"
              value={v.enqueueWindowMin}
              onChange={(n) => change('enqueueWindowMin', n)}
              min={1}
              max={120}
            />
          </FormField>
          <FormField label={t('enqueueLimitPerWindow')} error={errors?.enqueueLimitPerWindow}>
            <NumberStepper
              size="sm"
              value={v.enqueueLimitPerWindow}
              onChange={(n) => change('enqueueLimitPerWindow', n)}
              min={1}
              max={100}
            />
          </FormField>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t('enqueueSummary', {
            windowMin: v.enqueueWindowMin,
            limit: v.enqueueLimitPerWindow,
            maxSelect: v.maxSelectPerAdd,
          })}
        </p>
        <div className="mt-3 border-t border-white/5 pt-3">
          <FormField label={t('replayCooldown')}>
            <select
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
              value={v.replayCooldownMin}
              onChange={(e) => change('replayCooldownMin', Number(e.target.value))}
            >
              <option value={0}>{t('replayNone')}</option>
              <option value={30}>{t('replay30')}</option>
              <option value={60}>{t('replay60')}</option>
              <option value={90}>{t('replay90')}</option>
              <option value={-1}>{t('replayForever')}</option>
            </select>
          </FormField>
          {v.replayCooldownMin !== 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {v.replayCooldownMin === -1 ? t('replayHintForever') : t('replayHintMin', { min: v.replayCooldownMin })}
            </p>
          )}
        </div>
      </FormSection>

      {/* ─── AutoDJ ─── */}
      <FormSection title="AutoDJ">
        <AutoDjSettings
          enabled={v.autoDjEnabled}
          mode={v.autoDjMode}
          threshold={v.autoDjThreshold}
          folderId={v.autoDjFolderId}
          favFallbackMixed={v.autoDjFavFallbackMixed}
          onEnabledChange={(c) => change('autoDjEnabled', c)}
          onModeChange={(m) => change('autoDjMode', m)}
          onThresholdChange={(n) => change('autoDjThreshold', n)}
          onFolderIdChange={(id) => change('autoDjFolderId', id)}
          onFavFallbackMixedChange={(c) => change('autoDjFavFallbackMixed', c)}
        />
      </FormSection>
    </div>
  );
}
