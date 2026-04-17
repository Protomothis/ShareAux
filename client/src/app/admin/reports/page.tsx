'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import type { ReportItem } from '@/api/model';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { useAdminReports, useResolveReport } from '@/hooks/admin/useAdminReports';

const TABS = [
  { value: 'pending', label: '대기중' },
  { value: 'resolved', label: '처리됨' },
  { value: 'dismissed', label: '무시됨' },
] as const;

const STATUS_VARIANT: Record<string, 'accent' | 'success' | 'muted'> = {
  pending: 'accent',
  resolved: 'success',
  dismissed: 'muted',
};

const STATUS_LABEL: Record<string, string> = {
  pending: '대기중',
  resolved: '처리됨',
  dismissed: '무시됨',
};

const LIMIT = 20;

interface ResolveTarget {
  id: string;
  status: 'resolved' | 'dismissed';
}

function ReportCard({
  report,
  onResolve,
  onDismiss,
}: {
  report: ReportItem;
  onResolve: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{report.reporterNickname ?? '알 수 없음'}</span>
            <span className="text-xs text-sa-text-muted">
              → {report.targetType}:{report.targetId.slice(0, 8)}
            </span>
            <StatusBadge variant={STATUS_VARIANT[report.status] ?? 'muted'}>
              {STATUS_LABEL[report.status] ?? report.status}
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm text-white">{report.reason}</p>
          {report.details && <p className="mt-1 text-xs text-sa-text-muted">{report.details}</p>}
          <p className="mt-2 text-xs text-sa-text-muted">{new Date(report.createdAt).toLocaleString('ko-KR')}</p>
        </div>
        {report.status === 'pending' && (
          <div className="flex shrink-0 gap-2">
            <Button variant="accent" size="sm" onClick={() => onResolve(report.id)}>
              처리
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDismiss(report.id)}>
              무시
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const [status, setStatus] = useState<string>('pending');
  const [page, setPage] = useState(1);
  const [resolveTarget, setResolveTarget] = useState<ResolveTarget | null>(null);

  const { data, isLoading } = useAdminReports({ page, limit: LIMIT, status });
  const resolveReport = useResolveReport();

  const handleResolve = useCallback(() => {
    if (!resolveTarget) return;
    resolveReport.mutate(resolveTarget, {
      onSuccess: () => {
        toast.success(resolveTarget.status === 'resolved' ? '신고가 처리되었습니다' : '신고가 무시되었습니다');
        setResolveTarget(null);
      },
    });
  }, [resolveTarget, resolveReport]);

  return (
    <div>
      <AdminPageHeader title="🚨 신고 관리" />

      {/* 탭 필터 */}
      <div className="mb-4 flex gap-1 rounded-xl bg-white/5 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition ${
              status === tab.value
                ? 'bg-sa-accent/10 font-medium text-sa-accent'
                : 'text-sa-text-muted hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 신고 목록 */}
      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5" />
            ))
          : data?.items.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onResolve={(id) => setResolveTarget({ id, status: 'resolved' })}
                onDismiss={(id) => setResolveTarget({ id, status: 'dismissed' })}
              />
            ))}
        {!isLoading && data?.items.length === 0 && (
          <p className="py-12 text-center text-sm text-sa-text-muted">신고가 없습니다</p>
        )}
      </div>

      <AdminPagination page={page} totalPages={Math.ceil((data?.total ?? 0) / LIMIT)} onPageChange={setPage} />

      <ConfirmDialog
        open={!!resolveTarget}
        onOpenChange={(open) => !open && setResolveTarget(null)}
        title={resolveTarget?.status === 'resolved' ? '신고 처리' : '신고 무시'}
        description={
          resolveTarget?.status === 'resolved' ? '이 신고를 처리하시겠습니까?' : '이 신고를 무시하시겠습니까?'
        }
        confirmLabel={resolveTarget?.status === 'resolved' ? '처리' : '무시'}
        variant={resolveTarget?.status === 'resolved' ? 'default' : 'destructive'}
        onConfirm={handleResolve}
        loading={resolveReport.isPending}
      />
    </div>
  );
}
