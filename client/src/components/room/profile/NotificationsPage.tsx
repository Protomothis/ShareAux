'use client';

import { useTranslations } from 'next-intl';

import Modal from '@/components/common/Modal';
import { NotificationSettings } from '@/components/common/NotificationSettings';

import { SubHeader } from './ProfileShared';

interface NotificationsPageProps {
  onBack: () => void;
}

export function NotificationsPage({ onBack }: NotificationsPageProps) {
  const t = useTranslations('profile');
  return (
    <>
      <Modal.Header>
        <SubHeader title={t('notifications')} onBack={onBack} />
      </Modal.Header>
      <Modal.Body>
        <NotificationSettings />
      </Modal.Body>
    </>
  );
}
