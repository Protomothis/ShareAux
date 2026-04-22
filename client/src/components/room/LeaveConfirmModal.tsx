'use client';

import Modal from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface LeaveConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function LeaveConfirmModal({ open, onConfirm, onClose }: LeaveConfirmModalProps) {
  const t = useTranslations('leave');
  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Header>
        <Modal.Title>{t('title')}</Modal.Title>
      </Modal.Header>
      <Modal.Footer>
        <Button variant="outline" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            onClose();
            onConfirm();
          }}
        >
          {t('confirm')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
