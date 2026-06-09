'use client';

import { Loader2 } from 'lucide-react';
import type { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { authControllerDeleteAccount } from '@/api/auth/auth';
import type { ApiError } from '@/api/mutator';
import { Button } from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import { FormField } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { useAuthStore } from '@/stores/auth';

import { SubHeader } from './ProfileShared';

interface DeletePageProps {
  onBack: () => void;
  router: ReturnType<typeof useRouter>;
}

export function DeletePage({ onBack, router }: DeletePageProps) {
  const t = useTranslations('profile');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    if (!password) {
      setError(t('deletePasswordRequired'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authControllerDeleteAccount({ password });
      useAuthStore.getState().clear();
      router.push('/login');
    } catch (e) {
      setError((e as ApiError).message || t('deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal.Header>
        <SubHeader title={t('deleteAccount')} onBack={onBack} />
      </Modal.Header>
      <Modal.Body className="space-y-3">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-xs text-red-400">{t('deleteWarning')}</p>
        </div>
        <FormField label={t('confirmPassword')} error={error}>
          <PasswordInput
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            placeholder={t('curPasswordPlaceholder')}
          />
        </FormField>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="destructive" className="w-full" onClick={() => setConfirmOpen(true)} disabled={!password}>
          {t('deleteAccount')}
        </Button>
      </Modal.Footer>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} className="sm:max-w-xs">
        <Modal.Header>
          <Modal.Title>{t('deleteConfirmTitle')}</Modal.Title>
          <Modal.Description>{t('deleteConfirmDesc')}</Modal.Description>
        </Modal.Header>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : t('deleteSubmit')}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
