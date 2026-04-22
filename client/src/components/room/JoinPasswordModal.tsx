'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import Modal from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface JoinPasswordModalProps {
  roomName: string;
  open: boolean;
  onSubmit: (password: string) => void;
  onClose: () => void;
}

export default function JoinPasswordModal({ open, onSubmit, onClose }: JoinPasswordModalProps) {
  const t = useTranslations('joinPassword');
  const [password, setPassword] = useState('');

  return (
    <Modal open={open} onClose={onClose} showCloseButton={false}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(password);
        }}
      >
        <Modal.Header>
          <Modal.Title>{t('title')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormField label={t('label')}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('placeholder')}
              autoFocus
            />
          </FormField>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" className="w-full">
            {t('join')}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
