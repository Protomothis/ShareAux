'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { authControllerUpdatePassword } from '@/api/auth/auth';
import { Button } from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import { FormField } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { useFormValidation } from '@/hooks/useFormValidation';

import { SubHeader } from './ProfileShared';

interface PasswordPageProps {
  onBack: () => void;
  onDone: (msg: string) => void;
}

export function PasswordPage({ onBack, onDone }: PasswordPageProps) {
  const t = useTranslations('profile');
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { errors, validate, clearError } = useFormValidation<{ cur: string; next: string; confirm: string }>({
    cur: (v) => !v && t('curPasswordRequired'),
    next: (v) => (!v ? t('newPasswordRequired') : v.length < 8 ? t('newPasswordMin') : false),
    confirm: (v, vals) => (!v ? t('confirmRequired') : v !== vals.next ? t('confirmMismatch') : false),
  });

  const handleSave = async () => {
    if (!validate({ cur, next, confirm })) return;
    setLoading(true);
    try {
      await authControllerUpdatePassword({ currentPassword: cur, newPassword: next });
      onDone(t('passwordSaved'));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal.Header>
        <SubHeader title={t('password')} onBack={onBack} />
      </Modal.Header>
      <Modal.Body className="space-y-3">
        <FormField label={t('curPassword')} error={errors.cur}>
          <PasswordInput
            value={cur}
            onChange={(e) => {
              setCur(e.target.value);
              clearError('cur');
            }}
            placeholder={t('curPasswordPlaceholder')}
            autoFocus
          />
        </FormField>
        <FormField label={t('newPassword')} error={errors.next}>
          <PasswordInput
            value={next}
            onChange={(e) => {
              setNext(e.target.value);
              clearError('next');
            }}
            placeholder={t('newPasswordPlaceholder')}
          />
        </FormField>
        <FormField label={t('confirmPassword')} error={errors.confirm}>
          <PasswordInput
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              clearError('confirm');
            }}
            placeholder={t('confirmPasswordPlaceholder')}
          />
        </FormField>
      </Modal.Body>
      <Modal.Footer>
        <Button className="w-full" onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : t('change')}
        </Button>
      </Modal.Footer>
    </>
  );
}
