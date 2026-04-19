'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import type { UserDetailResponse } from '@/api/model';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useDeleteUser } from '@/hooks/admin/useAdminUserDetail';

interface UserDeleteSectionProps {
  user: UserDetailResponse;
}

export function UserDeleteSection({ user }: UserDeleteSectionProps) {
  const [open, setOpen] = useState(false);
  const deleteUser = useDeleteUser(user.id);
  const router = useRouter();

  const isSuperAdmin = user.role === 'superAdmin';

  const handleDelete = useCallback(() => {
    deleteUser.mutate(
      { id: user.id },
      {
        onSuccess: () => {
          toast.success('계정이 삭제되었습니다');
          router.push('/admin/users');
        },
      },
    );
  }, [user, deleteUser, router]);

  if (isSuperAdmin) return null;

  return (
    <div className="mt-4 rounded-2xl border border-red-500/10 bg-red-500/[0.03] p-4 sm:p-6">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-red-400">
        <Trash2 size={16} /> 계정 삭제
      </h3>
      <p className="mb-3 text-xs text-sa-text-muted">삭제된 계정은 복구할 수 없습니다. 재생 기록은 보존됩니다.</p>
      <Button variant="destructive" className="gap-1.5" onClick={() => setOpen(true)}>
        <Trash2 size={14} /> 계정 삭제
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="계정 삭제"
        description={`${user.nickname} 계정을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteUser.isPending}
      />
    </div>
  );
}
