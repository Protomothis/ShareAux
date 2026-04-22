'use client';

import { Loader2, ShieldBan } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import type { UserDetailResponse } from '@/api/model';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useBanUser, useUnbanUser } from '@/hooks/admin/useAdminUserDetail';
import { useTranslations } from 'next-intl';

interface UserBanSectionProps {
  user: UserDetailResponse;
}

export function UserBanSection({ user }: UserBanSectionProps) {
  const t = useTranslations('admin.userDetail');
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const banUser = useBanUser(user.id);
  const unbanUser = useUnbanUser(user.id);

  const isSuperAdmin = user.role === 'superAdmin';

  const handleBan = useCallback(() => {
    if (user.bannedAt) {
      unbanUser.mutate(
        { id: user.id },
        {
          onSuccess: () => toast.success(t('unbanned')),
        },
      );
    } else {
      banUser.mutate(
        { id: user.id },
        {
          onSuccess: () => {
            toast.success(t('accountBanned'));
            setBanDialogOpen(false);
          },
        },
      );
    }
  }, [user, banUser, unbanUser]);

  return (
    <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.03] p-4 sm:p-6">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
        <ShieldBan size={16} /> 계정 정지
      </h3>
      {isSuperAdmin ? (
        <p className="text-sm text-sa-text-muted">{t('cannotBanSuperAdmin')}</p>
      ) : user.bannedAt ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-sa-text-muted">정지일: {new Date(user.bannedAt).toLocaleDateString('ko-KR')}</p>
          <Button variant="outline" className="gap-1.5" onClick={handleBan} disabled={unbanUser.isPending}>
            {unbanUser.isPending && <Loader2 size={14} className="animate-spin" />}
            정지 해제
          </Button>
        </div>
      ) : (
        <>
          <Button variant="destructive" className="gap-1.5" onClick={() => setBanDialogOpen(true)}>
            <ShieldBan size={14} /> 계정 정지
          </Button>
          <ConfirmDialog
            open={banDialogOpen}
            onOpenChange={setBanDialogOpen}
            title={t('accountBan')}
            description={`${user.nickname} 계정을 정지하시겠습니까? 정지된 사용자는 로그인 및 접속이 차단됩니다.`}
            confirmLabel={t('banLabel')}
            variant="destructive"
            onConfirm={handleBan}
            loading={banUser.isPending}
          />
        </>
      )}
    </div>
  );
}
