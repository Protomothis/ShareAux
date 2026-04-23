'use client';

import { useState } from 'react';

import type { CreateInviteCodeDtoPermissionsItem } from '@/api/model';
import { CheckboxGroup } from '@/components/admin/CheckboxGroup';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import NumberStepper from '@/components/ui/number-stepper';
import { Switch } from '@/components/ui/switch';
import { usePermissionMeta, usePermLookup } from '@/hooks/usePermissionMeta';
import { useTranslations } from 'next-intl';

export interface InviteCodeFormData {
  code?: string;
  maxUses: number;
  permissions: CreateInviteCodeDtoPermissionsItem[];
  expiresAt?: string;
  allowRegistration: boolean;
}

interface InviteCodeFormProps {
  onSubmit: (data: InviteCodeFormData) => void;
  isPending?: boolean;
  submitLabel?: string;
}

export function InviteCodeForm({ onSubmit, isPending, submitLabel }: InviteCodeFormProps) {
  const t = useTranslations('admin.inviteCodes');
  const [code, setCode] = useState('');
  const [maxUses, setMaxUses] = useState(10);
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [permissions, setPermissions] = useState<Set<string> | null>(null);
  const [allowRegistration, setAllowRegistration] = useState(true);

  const { data: permMeta } = usePermissionMeta();
  const pl = usePermLookup();
  const permOptions = (permMeta ?? []).map((m) => ({
    key: m.key,
    label: pl.full(m.key),
    disabled: m.key === 'listen',
  }));

  const activePerms = permissions ?? new Set((permMeta ?? []).map((m) => m.key));

  const togglePerm = (key: string) => {
    setPermissions((prev) => {
      const next = new Set(prev ?? activePerms);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...(code && { code }),
      maxUses,
      permissions: [...activePerms] as CreateInviteCodeDtoPermissionsItem[],
      ...(expiresAt && { expiresAt: expiresAt.toISOString() }),
      allowRegistration,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label={t('codeLabel')}>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="PARTY2026"
          minLength={6}
          maxLength={12}
        />
        {code.length > 0 && code.length < 6 && <p className="mt-1 text-xs text-red-400">{t('codeMinLength')}</p>}
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label={t('maxUses')}>
          <NumberStepper value={maxUses} onChange={setMaxUses} min={10} max={100} step={10} />
        </FormField>
        <FormField label={t('expiresAt')}>
          <DatePicker value={expiresAt} onChange={setExpiresAt} placeholder={t('noExpiry')} />
        </FormField>
      </div>
      <CheckboxGroup
        label={t('accountPermissions')}
        options={permOptions}
        selected={activePerms}
        onChange={togglePerm}
      />
      <p className="text-[11px] text-sa-text-muted">{t('permissionHint')}</p>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white">{t('allowRegistration')}</p>
          <p className="text-xs text-sa-text-muted">{t('allowRegistrationDesc')}</p>
        </div>
        <Switch checked={allowRegistration} onCheckedChange={setAllowRegistration} />
      </div>
      <Button
        type="submit"
        variant="accent"
        className="w-full"
        disabled={isPending || (code.length > 0 && code.length < 6)}
      >
        {isPending ? t('creating') : (submitLabel ?? t('create'))}
      </Button>
    </form>
  );
}
