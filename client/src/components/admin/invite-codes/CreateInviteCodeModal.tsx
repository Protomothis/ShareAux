'use client';

import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import Modal from '@/components/common/Modal';
import { useCreateInviteCode } from '@/hooks/admin/useAdminInviteCodes';
import { InviteCodeForm } from './InviteCodeForm';
import type { InviteCodeFormData } from './InviteCodeForm';

interface CreateInviteCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInviteCodeModal({ open, onOpenChange }: CreateInviteCodeModalProps) {
  const t = useTranslations('admin.inviteCodes');
  const createCode = useCreateInviteCode();

  const handleSubmit = (data: InviteCodeFormData) => {
    createCode.mutate(
      { data },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success(t('created'));
        },
      },
    );
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} className="sm:max-w-md">
      <Modal.Header>
        <Modal.Title>{t('new')}</Modal.Title>
        <Modal.Description>{t('createDesc')}</Modal.Description>
      </Modal.Header>
      <Modal.Body>
        <InviteCodeForm onSubmit={handleSubmit} isPending={createCode.isPending} />
      </Modal.Body>
    </Modal>
  );
}
