'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import type { CreateInviteCodeDtoPermissionsItem } from '@/api/model';
import { CheckboxGroup } from '@/components/admin/CheckboxGroup';
import Modal from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import NumberStepper from '@/components/ui/number-stepper';
import { Switch } from '@/components/ui/switch';
import { useCreateInviteCode } from '@/hooks/admin/useAdminInviteCodes';
import { usePermissionMeta } from '@/hooks/usePermissionMeta';
import { useTranslations } from 'next-intl';

interface CreateInviteCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInviteCodeModal({
  open, onOpenChange }: CreateInviteCodeModalProps) {
  const t = useTranslations('admin.inviteCodes');
  const [code, setCode] = useState('');
  const [maxUses, setMaxUses] = useState(10);
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [permissions, setPermissions] = useState<Set<string>>(new Set(['listen']));
  const [allowRegistration, setAllowRegistration] = useState(true);

  const createCode = useCreateInviteCode();
  const { data: permMeta } = usePermissionMeta();
  const permOptions = (permMeta ?? []).map((m) => ({
    key: m.key,
    label: `${m.emoji} ${m.label}`,
    disabled: m.key === 'listen',
  }));

  const resetForm = () => {
    setCode('');
    setMaxUses(10);
    setExpiresAt(undefined);
    setPermissions(new Set(['listen']));
    setAllowRegistration(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createCode.mutate(
      {
        data: {
          ...(code && { code }),
          maxUses,
          permissions: [...permissions] as CreateInviteCodeDtoPermissionsItem[],
          ...(expiresAt && { expiresAt: expiresAt.toISOString() }),
          allowRegistration,
        },
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
          toast.success(t('created'));
        },
      },
    );
  };

  const togglePerm = (key: string) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} className="sm:max-w-md">
      <form onSubmit={handleCreate}>
        <Modal.Header>
          <Modal.Title>{t('new')}</Modal.Title>
          <Modal.Description>{t('createDesc')}</Modal.Description>
        </Modal.Header>
        <Modal.Body className="space-y-4">
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
          <CheckboxGroup label={t('accountPermissions')} options={permOptions} selected={permissions} onChange={togglePerm} />
          <p className="text-[11px] text-sa-text-muted">{t('permissionHint')}</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">{t('allowRegistration')}</p>
              <p className="text-xs text-sa-text-muted">{t('allowRegistrationDesc')}</p>
            </div>
            <Switch checked={allowRegistration} onCheckedChange={setAllowRegistration} />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="submit"
            variant="accent"
            disabled={createCode.isPending || (code.length > 0 && code.length < 6)}
          >
            {createCode.isPending ? '생성 중...' : '생성'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
