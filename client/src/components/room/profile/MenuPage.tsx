'use client';

import { Bell, KeyRound, Link2, Trash2, User as UserIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { User } from '@/api/model';
import { UserRole } from '@/api/model';
import Modal from '@/components/common/Modal';
import { useAuthConfig } from '@/hooks/useAuthConfig';

import { MenuItem } from './ProfileShared';

type Page = 'menu' | 'nickname' | 'password' | 'google' | 'delete' | 'notifications';

interface MenuPageProps {
  setPage: (p: Page) => void;
  me: User | null;
  role?: string;
}

export function MenuPage({ setPage, me, role }: MenuPageProps) {
  const t = useTranslations('profile');
  const authConfig = useAuthConfig();
  const isGuest = role === UserRole.guest;
  return (
    <>
      <Modal.Header>
        <Modal.Title>{t('title')}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="-mx-0 space-y-0.5">
        <MenuItem
          icon={<UserIcon size={16} />}
          label={t('nickname')}
          description={me?.nickname}
          onClick={() => setPage('nickname')}
        />
        {!isGuest && (
          <MenuItem
            icon={<KeyRound size={16} />}
            label={t('password')}
            description={t('passwordDesc')}
            onClick={() => setPage('password')}
          />
        )}
        {!isGuest && authConfig.google && (
          <MenuItem
            icon={<Link2 size={16} />}
            label={t('google')}
            description={me?.email ?? t('googleNotLinked')}
            onClick={() => setPage('google')}
          />
        )}
        <div className="my-1 h-px bg-white/[0.06]" />
        <MenuItem
          icon={<Bell size={16} />}
          label={t('notifications')}
          description={t('notificationsDesc')}
          onClick={() => setPage('notifications')}
        />
        {!isGuest && role !== 'superAdmin' && (
          <>
            <div className="my-1 h-px bg-white/[0.06]" />
            <MenuItem
              icon={<Trash2 size={14} />}
              label={t('deleteAccount')}
              variant="danger"
              onClick={() => setPage('delete')}
            />
          </>
        )}
      </Modal.Body>
    </>
  );
}
