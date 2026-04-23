'use client';

import { Surface } from '@/components/ui/surface';

import { Loader2, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import type { UserDetailResponse } from '@/api/model';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useDeleteUser } from '@/hooks/admin/useAdminUserDetail';
import { useTranslations } from 'next-intl';

interface UserDeleteSectionProps {
  user: UserDetailResponse;
}

export function UserDeleteSection({ user }: UserDeleteSectionProps) {
  const t = useTranslations('admin.userDetail');
  const [open, setOpen] = useState(false);
  const deleteUser = useDeleteUser(user.id);
  const router = useRouter();

  const isSuperAdmin = user.role === 'superAdmin';

  const handleDelete = useCallback(() => {
    deleteUser.mutate(
      { id: user.id },
      {
        onSuccess: () => {
          toast.success(t('accountDeleted'));
          router.push('/admin/users');
        },
      },
    );
  }, [user, deleteUser, router]);

  if (isSuperAdmin) return null;

  return (
    <Surface variant="danger" padding="lg" className="mt-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-red-400">
        <Trash2 size={16} /> {t('accountDelete')}
      </h3>
      <p className="mb-3 text-xs text-sa-text-muted">{t('deleteHint')}</p>
      <Button variant="destructive" className="gap-1.5" onClick={() => setOpen(true)}>
        <Trash2 size={14} /> {t('accountDelete')}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t('accountDelete')}
        description={t('deleteConfirmDesc', { nickname: user.nickname })}
        confirmLabel={t('delete')}
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteUser.isPending}
      />
    </Surface>
  );
}
