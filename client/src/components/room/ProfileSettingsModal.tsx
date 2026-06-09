'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { authControllerMe } from '@/api/auth/auth';
import type { User } from '@/api/model';
import Modal from '@/components/common/Modal';
import { useAuthStore } from '@/stores/auth';

import { DeletePage, GooglePage, MenuPage, NicknamePage, NotificationsPage } from './profile';
import { PasswordPage } from './profile/PasswordPage';

type Page = 'menu' | 'nickname' | 'password' | 'google' | 'delete' | 'notifications';

interface ProfileSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ProfileSettingsModal({ open, onClose }: ProfileSettingsModalProps) {
  const [page, setPage] = useState<Page>('menu');
  const [me, setMe] = useState<User | null>(null);
  const role = useAuthStore((s) => s.role);
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      setPage('menu');
      return;
    }
    authControllerMe()
      .then(setMe)
      .catch(() => {});
  }, [open]);

  const done = useCallback(
    (msg: string) => {
      toast.success(msg);
      onClose();
    },
    [onClose],
  );

  return (
    <Modal open={open} onClose={onClose} className="sm:max-w-sm">
      {page === 'menu' && <MenuPage setPage={setPage} me={me} role={role} />}
      {page === 'nickname' && <NicknamePage me={me} onBack={() => setPage('menu')} onDone={done} />}
      {page === 'password' && <PasswordPage onBack={() => setPage('menu')} onDone={done} />}
      {page === 'google' && <GooglePage me={me} onBack={() => setPage('menu')} />}
      {page === 'delete' && <DeletePage onBack={() => setPage('menu')} router={router} />}
      {page === 'notifications' && <NotificationsPage onBack={() => setPage('menu')} />}
    </Modal>
  );
}
