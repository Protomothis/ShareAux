import { User as UserIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { UserRole } from '@/api/model';
import type { UserDetailResponse } from '@/api/model';
import { StatusBadge } from '@/components/admin/StatusBadge';

interface UserProfileHeaderProps {
  user: UserDetailResponse;
}

export function UserProfileHeader({ user }: UserProfileHeaderProps) {
  const t = useTranslations('admin.userDetail');
  const isSuperAdmin = user.role === UserRole.superAdmin;

  return (
    <div className="mb-6 flex items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sa-accent/10">
        <UserIcon size={24} className="text-sa-accent" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">{user.nickname}</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm text-sa-text-muted">
          {user.username && <span>@{user.username}</span>}
          {user.email && <span>{user.email}</span>}
          <StatusBadge variant={isSuperAdmin ? 'accent' : user.role === UserRole.guest ? 'muted' : 'success'}>
            {user.role}
          </StatusBadge>
          {user.bannedAt && <StatusBadge variant="danger">{t('banned')}</StatusBadge>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-sa-text-muted">
          <span>
            {t('providerLabel')}:{' '}
            {
              { google: t('providers.google'), local: t('providers.local'), invite: t('providers.invite') }[
                user.provider
              ]
            }
          </span>
          <span>·</span>
          <span>
            {t('googleLinked')}: {user.googleId ? '✅' : '❌'}
          </span>
          <span>·</span>
          <span>
            {t('joinDate')}: {new Date(user.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
