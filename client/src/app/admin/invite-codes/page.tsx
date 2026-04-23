'use client';

import { Link2, Plus, Power, Trash2, Users } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import type { InviteCode } from '@/api/model';
import { usePermissionMeta, usePermLookup } from '@/hooks/usePermissionMeta';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CreateInviteCodeModal } from '@/components/admin/invite-codes';
import { InviteCodeUsersModal } from '@/components/admin/InviteCodeUsersModal';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { useAdminInviteCodes, useDeactivateInviteCode, useDeleteInviteCode } from '@/hooks/admin/useAdminInviteCodes';
import { useTranslations } from 'next-intl';
import { SkeletonCard, SkeletonLine } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

const LIMIT = 20;

interface ActionTarget {
  id: string;
  type: 'deactivate' | 'delete';
}

export default function AdminInviteCodesPage() {
  const t = useTranslations('admin.inviteCodes');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [usersTarget, setUsersTarget] = useState<{ id: string; code: string } | null>(null);

  const { data, isLoading } = useAdminInviteCodes({ page, limit: LIMIT });
  const { data: permMeta } = usePermissionMeta();
  const perm = usePermLookup();
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
            toast.success(t('deactivated'));
            setActionTarget(null);
          },
        },
      );
    } else {
      setDeleting(true);
      try {
        await deleteCode.mutate(actionTarget.id, {
          onSuccess: () => {
            toast.success(t('deleted'));
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
    navigator.clipboard.writeText(url).then(() => toast.success(t('linkCopied')));
  }, []);

  const items = data?.items ?? [];

  return (
    <div>
      <AdminPageHeader title={t('title')}>
        <Button onClick={() => setShowCreate(true)} variant="accent" size="sm" className="gap-1.5">
          <Plus size={14} />
          <span className="hidden sm:inline">{t('new')}</span>
        </Button>
      </AdminPageHeader>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="{t('empty')}" />
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
              onShowUsers={() => setUsersTarget({ id: item.id, code: item.code })}
            />
          ))}
        </div>
      )}

      <AdminPagination page={page} totalPages={Math.ceil((data?.total ?? 0) / LIMIT)} onPageChange={setPage} />
      <CreateInviteCodeModal open={showCreate} onOpenChange={setShowCreate} />
      <InviteCodeUsersModal
        inviteCodeId={usersTarget?.id ?? null}
        code={usersTarget?.code ?? ''}
        onOpenChange={(open) => !open && setUsersTarget(null)}
      />
      <ConfirmDialog
        open={!!actionTarget}
        onOpenChange={(open) => !open && setActionTarget(null)}
        title={actionTarget?.type === 'delete' ? t('deleteTitle') : t('deactivateTitle')}
        description={actionTarget?.type === 'delete' ? t('deleteDesc') : t('deactivateDesc')}
        confirmLabel={actionTarget?.type === 'delete' ? t('delete') : t('deactivate')}
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
  onShowUsers: () => void;
}

function InviteCodeCard({ item, permLabel, onCopy, onDeactivate, onDelete, onShowUsers }: InviteCodeCardProps) {
  const t = useTranslations('admin.inviteCodes');
  const pct = Math.round((item.usedCount / item.maxUses) * 100);
  const expiresLabel = item.expiresAt
    ? new Date(item.expiresAt) < new Date()
      ? t('expired')
      : new Date(item.expiresAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) + ' ' + t('until')
    : t('noExpiry');

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-white/5 px-2.5 py-1 font-mono text-sm text-white">{item.code}</span>
          <StatusBadge variant={item.isActive ? 'success' : 'muted'}>
            {item.isActive ? t('activeStatus') : t('inactiveStatus')}
          </StatusBadge>
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
          <Button variant="ghost" size="icon-sm" onClick={onShowUsers} className="text-sa-text-muted hover:text-white">
            <Users size={14} />
          </Button>
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
        <span>
          {t('registration')} {item.allowRegistration ? '✓' : '✕'}
        </span>
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
