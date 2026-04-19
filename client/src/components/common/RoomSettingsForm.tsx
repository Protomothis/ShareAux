'use client';

import { FormField, FormSection } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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

  return (
    <div className="space-y-5">
      {/* ─── 기본 정보 ─── */}
      <FormSection title="기본 정보">
        <FormField label="방 이름" htmlFor="name" error={errors?.name}>
          <Input
            id="name"
            value={v.name}
            onChange={(e) => change('name', e.target.value)}
            placeholder="파티 이름을 입력하세요"
            autoFocus={mode === 'create'}
          />
        </FormField>
        {mode === 'create' && (
          <>
            <FormField label="최대 인원" error={errors?.maxMembers}>
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
              label="비밀방"
              htmlFor="isPrivate"
              checked={v.isPrivate}
              onCheckedChange={(c) => change('isPrivate', c)}
            >
              <Input
                type="password"
                value={v.password}
                onChange={(e) => change('password', e.target.value)}
                placeholder="비밀번호 입력"
              />
              {errors?.password && <p className="mt-1 text-xs text-destructive">{errors.password}</p>}
            </SettingCard>
          </>
        )}
      </FormSection>

      {/* ─── 권한 & 재생 ─── */}
      <FormSection title="재생 설정">
        <div className="grid gap-2 sm:grid-cols-2">
          <SettingCard
            icon="🔀"
            label="크로스페이드"
            description="곡 전환 시 페이드"
            htmlFor="crossfade"
            checked={v.crossfade}
            onCheckedChange={(c) => change('crossfade', c)}
          />
          <SettingCard
            icon="🎵"
            label="곡 신청 허용"
            description="새 멤버 기본 권한"
            htmlFor="defaultEnqueue"
            checked={v.defaultEnqueueEnabled}
            onCheckedChange={(c) => change('defaultEnqueueEnabled', c)}
          />
          <SettingCard
            icon="⏭️"
            label="스킵 투표 허용"
            description="새 멤버 기본 권한"
            htmlFor="defaultVoteSkip"
            checked={v.defaultVoteSkipEnabled}
            onCheckedChange={(c) => change('defaultVoteSkipEnabled', c)}
          />
        </div>
      </FormSection>

      {/* ─── 곡 신청 ─── */}
      <FormSection title="곡 신청">
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="1회 추가 곡 수" error={errors?.maxSelectPerAdd}>
            <NumberStepper
              size="sm"
              value={v.maxSelectPerAdd}
              onChange={(n) => change('maxSelectPerAdd', n)}
              min={1}
              max={10}
            />
          </FormField>
          <FormField label="제한 시간 (분)" error={errors?.enqueueWindowMin}>
            <NumberStepper
              size="sm"
              value={v.enqueueWindowMin}
              onChange={(n) => change('enqueueWindowMin', n)}
              min={1}
              max={120}
            />
          </FormField>
          <FormField label="시간당 최대 곡" error={errors?.enqueueLimitPerWindow}>
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
          {v.enqueueWindowMin}분 동안 멤버당 최대 {v.enqueueLimitPerWindow}곡, 1회 {v.maxSelectPerAdd}곡 (DJ 제외)
        </p>
        <div className="mt-3 border-t border-white/5 pt-3">
          <FormField label="재신청 제한">
            <select
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white"
              value={v.replayCooldownMin}
              onChange={(e) => change('replayCooldownMin', Number(e.target.value))}
            >
              <option value={0}>제한 없음</option>
              <option value={30}>30분</option>
              <option value={60}>60분</option>
              <option value={90}>90분</option>
              <option value={-1}>방 종료까지</option>
            </select>
          </FormField>
          {v.replayCooldownMin !== 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {v.replayCooldownMin === -1
                ? '같은 곡은 방이 종료될 때까지 재신청 불가 (DJ 제외)'
                : `같은 곡은 재생 후 ${v.replayCooldownMin}분간 재신청 불가 (DJ 제외)`}
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
          onEnabledChange={(c) => change('autoDjEnabled', c)}
          onModeChange={(m) => change('autoDjMode', m)}
          onThresholdChange={(n) => change('autoDjThreshold', n)}
        />
      </FormSection>
    </div>
  );
}
