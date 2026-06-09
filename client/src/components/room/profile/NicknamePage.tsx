'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { authControllerUpdateNickname } from '@/api/auth/auth';
import type { User } from '@/api/model';
import { Button } from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useAuthStore } from '@/stores/auth';

import { SubHeader } from './ProfileShared';

interface NicknamePageProps {
  me: User | null;
  onBack: () => void;
  onDone: (msg: string) => void;
}

export function NicknamePage({ me, onBack, onDone }: NicknamePageProps) {
  const t = useTranslations('profile');
  const [value, setValue] = useState(me?.nickname ?? '');
  const [loading, setLoading] = useState(false);
  const { errors, validate, clearError } = useFormValidation<{ nickname: string }>({
    nickname: (v) => (!v.trim() ? t('nicknameRequired') : v.trim().length < 2 ? t('nicknameMin') : false),
  });

  const handleSave = async () => {
    if (!validate({ nickname: value })) return;
    setLoading(true);
    try {
      await authControllerUpdateNickname({ nickname: value.trim() });
      useAuthStore.setState({ nickname: value.trim() });
      onDone(t('nicknameSaved'));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal.Header>
        <SubHeader title={t('nickname')} onBack={onBack} />
      </Modal.Header>
      <Modal.Body>
        <FormField label={t('nicknameLabel')} error={errors.nickname}>
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              clearError('nickname');
            }}
            placeholder={t('nicknamePlaceholder')}
            maxLength={20}
            autoFocus
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
