'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

import { UserBanSection } from '@/components/admin/user-detail/UserBanSection';
import { UserDeleteSection } from '@/components/admin/user-detail/UserDeleteSection';
import { UserHistorySection } from '@/components/admin/user-detail/UserHistorySection';
import { UserPermissionSection } from '@/components/admin/user-detail/UserPermissionSection';
import { UserProfileHeader } from '@/components/admin/user-detail/UserProfileHeader';
import { useAdminUserDetail } from '@/hooks/admin/useAdminUserDetail';
import { useTranslations } from 'next-intl';

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('admin.userDetail');
  const { id } = use(params);
  const { data: user, isLoading } = useAdminUserDetail(id);

  if (isLoading || !user) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sa-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin/users" className="mb-4 flex items-center gap-1 text-sm text-sa-text-muted hover:text-white">
        <ArrowLeft size={14} /> {t('backToList')}
      </Link>
      <UserProfileHeader user={user} />
      <UserPermissionSection user={user} />
      <UserHistorySection user={user} />
      <UserBanSection user={user} />
      <UserDeleteSection user={user} />
    </div>
  );
}
