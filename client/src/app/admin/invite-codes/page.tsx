'use client';

import { Link2, Plus, Power, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import type { InviteCode } from '@/api/model';
import { buildPermLookup, usePermissionMeta } from '@/hooks/usePermissionMeta';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CreateInviteCodeModal } from '@/components/admin/CreateInviteCodeModal';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { useAdminInviteCodes, useDeactivateInviteCode, useDeleteInviteCode } from '@/hooks/admin/useAdminInviteCodes';

const LIMIT = 20;

interface ActionTarget {
  id: string;
  type: 'deactivate' | 'delete';
}

export default function AdminInviteCodesPage() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);

  const { data, isLoading } = useAdminInviteCodes({ page, limit: LIMIT });
  const { data: permMeta } = usePermissionMeta();
  const perm = buildPermLookup(permMeta);
  const deactivate = useDeactivateInviteCode();
  const deleteCode = useDeleteInviteCode();
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!actionTarget) return;
    if (actionTarget.type === 'deactivate') {
      deactivate.mutate(
        { id: actionTarget.id },
        {
          onSuccess: () => {
            toast.success('비활성화되었습니다');
            setActionTarget(null);
          },
        },
      );
    } else {
      setDeleting(true);
      try {
        await deleteCode.mutate(actionTarget.id, {
          onSuccess: () => {
            toast.success('삭제되었습니다');
            setActionTarget(null);
          },
        });
      } finally {
        setDeleting(false);
      }
    }
  }, [actionTarget, deactivate, deleteCode]);

  const copyLink = useCallback((code: string) => {
    const url = `${window.location.origin}/login?code=${code}`;
    navigator.clipboard.writeText(url).then(() => toast.success('초대 링크가 복사되었습니다'));
  }, []);

  const items = data?.items ?? [];

  return (
    <div>
      <AdminPageHeader title="초대코드 관리">
        <Button onClick={() => setShowCreate(true)} variant="accent" size="sm" className="gap-1.5">
          <Plus size={14} />
          <span className="hidden sm:inline">새 초대코드</span>
        </Button>
      </AdminPageHeader>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-12 text-center text-sm text-sa-text-muted">
          초대코드가 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <InviteCodeCard
              key={item.id}
              item={item}
              permLabel={perm.full}
              onCopy={copyLink}
              onDeactivate={() => setActionTarget({ id: item.id, type: 'deactivate' })}
              onDelete={() => setActionTarget({ id: item.id, type: 'delete' })}
            />
          ))}
        </div>
      )}

      <AdminPagination page={page} totalPages={Math.ceil((data?.total ?? 0) / LIMIT)} onPageChange={setPage} />
      <CreateInviteCodeModal open={showCreate} onOpenChange={setShowCreate} />
      <ConfirmDialog
        open={!!actionTarget}
        onOpenChange={(open) => !open && setActionTarget(null)}
        title={actionTarget?.type === 'delete' ? '초대코드 삭제' : '초대코드 비활성화'}
        description={
          actionTarget?.type === 'delete'
            ? '이 초대코드를 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
            : '이 초대코드를 비활성화하시겠습니까?'
        }
        confirmLabel={actionTarget?.type === 'delete' ? '삭제' : '비활성화'}
        variant="destructive"
        onConfirm={handleConfirm}
        loading={deactivate.isPending || deleting}
      />
    </div>
  );
}

interface InviteCodeCardProps {
  item: InviteCode;
  permLabel: (key: string) => string;
  onCopy: (code: string) => void;
  onDeactivate: () => void;
  onDelete: () => void;
}

function InviteCodeCard({ item, permLabel, onCopy, onDeactivate, onDelete }: InviteCodeCardProps) {
  const pct = Math.round((item.usedCount / item.maxUses) * 100);
  const expiresLabel = item.expiresAt
    ? new Date(item.expiresAt) < new Date()
      ? '만료됨'
      : new Date(item.expiresAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' 까지'
    : '무기한';

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-white/5 px-2.5 py-1 font-mono text-sm text-white">{item.code}</span>
          <StatusBadge variant={item.isActive ? 'success' : 'muted'}>{item.isActive ? '활성' : '비활성'}</StatusBadge>
        </div>
        <div className="flex items-center gap-1">
          {item.isActive && (
            <Button variant="ghost" size="icon-sm" onClick={() => onCopy(item.code)} className="text-sa-accent">
              <Link2 size={14} />
            </Button>
          )}
          {item.isActive && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onDeactivate}
              className="text-sa-text-muted hover:text-amber-400"
            >
              <Power size={14} />
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={onDelete} className="text-sa-text-muted hover:text-red-400">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* 권한 태그 */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {item.permissions.map((p) => (
          <span key={p} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-sa-text-muted">
            {permLabel(p)}
          </span>
        ))}
      </div>

      {/* 메타 정보 */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sa-text-muted">
        <span>
          사용 <span className="font-medium text-white">{item.usedCount}</span>/{item.maxUses}
        </span>
        <span>회원가입 {item.allowRegistration ? '✓' : '✕'}</span>
        <span>{expiresLabel}</span>
      </div>

      <div className="mt-2 h-1 rounded-full bg-white/5">
        <div
          className={`h-1 rounded-full transition-all ${pct >= 80 ? 'bg-amber-400' : 'bg-sa-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
