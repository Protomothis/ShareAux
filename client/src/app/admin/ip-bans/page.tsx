'use client';

import { format } from 'date-fns';
import { Shield, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { BannedIpItem } from '@/api/model';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { AdminTable } from '@/components/admin/AdminTable';
import type { Column } from '@/components/admin/AdminTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAdminIpBans, useBanIp, useUnbanIp } from '@/hooks/admin/useAdminIpBans';

const LIMIT = 20;

export default function AdminIpBansPage() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [unbanTarget, setUnbanTarget] = useState<string | null>(null);

  // form state
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();

  const { data, isLoading } = useAdminIpBans({ page, limit: LIMIT });
  const banIp = useBanIp();
  const unbanIp = useUnbanIp();

  const resetForm = () => {
    setIp('');
    setReason('');
    setExpiresAt(undefined);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    banIp.mutate(
      {
        data: {
          ip,
          ...(reason && { reason }),
          ...(expiresAt && { expiresAt: expiresAt.toISOString() }),
        },
      },
      {
        onSuccess: () => {
          resetForm();
          setShowCreate(false);
          toast.success('IP가 차단되었습니다');
        },
      },
    );
  };

  const handleUnban = () => {
    if (!unbanTarget) return;
    unbanIp.mutate(
      { id: unbanTarget },
      {
        onSuccess: () => {
          toast.success('차단이 해제되었습니다');
          setUnbanTarget(null);
        },
      },
    );
  };

  const fmt = (d: string) => format(new Date(d), 'yyyy-MM-dd HH:mm');

  const columns: Column<BannedIpItem>[] = [
    {
      key: 'ip',
      header: 'IP',
      primary: true,
      render: (item) => <span className="font-mono text-sm text-white">{item.ip}</span>,
    },
    {
      key: 'reason',
      header: '사유',
      render: (item) => <span className="text-sa-text-muted">{item.reason ?? '-'}</span>,
    },
    {
      key: 'banner',
      header: '차단자',
      hideOnMobile: true,
      render: (item) => <span className="text-sa-text-muted">{item.bannerNickname ?? '-'}</span>,
    },
    {
      key: 'expiresAt',
      header: '만료일',
      hideOnMobile: true,
      render: (item) => <span className="text-sa-text-muted">{item.expiresAt ? fmt(item.expiresAt) : '영구'}</span>,
    },
    {
      key: 'createdAt',
      header: '차단일',
      hideOnMobile: true,
      render: (item) => <span className="text-sa-text-muted">{fmt(item.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (item) => (
        <Button variant="destructive" size="sm" onClick={() => setUnbanTarget(item.id)}>
          <Trash2 size={12} className="mr-1" />
          해제
        </Button>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader title="IP 차단 관리">
        <Button onClick={() => setShowCreate(true)} variant="accent" className="gap-1.5">
          <Shield size={16} />
          <span className="hidden sm:inline">IP 차단</span>
        </Button>
      </AdminPageHeader>

      <AdminTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        rowKey={(item) => item.id}
        emptyMessage="차단된 IP가 없습니다"
      />
      <AdminPagination page={page} totalPages={Math.ceil((data?.total ?? 0) / LIMIT)} onPageChange={setPage} />

      {/* 생성 모달 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>IP 차단</DialogTitle>
            <DialogDescription>차단할 IP 주소를 입력하세요</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormField label="IP 주소">
              <Input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.1.1" required />
            </FormField>
            <FormField label="사유 (선택)">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="스팸, 악용 등" />
            </FormField>
            <FormField label="만료일 (선택)">
              <DatePicker value={expiresAt} onChange={setExpiresAt} placeholder="영구 차단" />
            </FormField>
            <DialogFooter>
              <Button type="submit" variant="accent" disabled={banIp.isPending || !ip.trim()}>
                {banIp.isPending ? '차단 중...' : '차단'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 해제 확인 */}
      <ConfirmDialog
        open={!!unbanTarget}
        onOpenChange={(open) => !open && setUnbanTarget(null)}
        title="IP 차단 해제"
        description="이 IP의 차단을 해제하시겠습니까?"
        confirmLabel="해제"
        variant="destructive"
        onConfirm={handleUnban}
        loading={unbanIp.isPending}
      />
    </div>
  );
}
