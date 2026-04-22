import { User as UserIcon } from 'lucide-react';

import type { UserDetailResponse } from '@/api/model';
import { PROVIDER_LABELS } from '@/lib/constants';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { useTranslations } from 'next-intl';

interface UserProfileHeaderProps {
  user: UserDetailResponse;
}

export function UserProfileHeader({ user }: UserProfileHeaderProps) {
  const isSuperAdmin = user.role === 'superAdmin';

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
          <StatusBadge variant={isSuperAdmin ? 'accent' : user.role === 'guest' ? 'muted' : 'success'}>
            {user.role}
          </StatusBadge>
          {user.bannedAt && <StatusBadge variant="danger">정지됨</StatusBadge>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-sa-text-muted">
          <span>가입 방식: {PROVIDER_LABELS[user.provider]?.label ?? user.provider}</span>
          <span>·</span>
          <span>Google 연동: {user.googleId ? '✅' : '❌'}</span>
          <span>·</span>
          <span>가입: {new Date(user.createdAt).toLocaleDateString('ko-KR')}</span>
        </div>
      </div>
    </div>
  );
}
