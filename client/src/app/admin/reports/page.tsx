'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import type { ReportItem } from '@/api/model';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { useAdminReports, useResolveReport } from '@/hooks/admin/useAdminReports';
import { SkeletonCard, SkeletonLine } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

const TABS = [
  { value: 'pending', label: 'pending' },
  { value: 'resolved', label: 'resolved' },
  { value: 'dismissed', label: 'dismissed' },
] as const;

const STATUS_VARIANT: Record<string, 'accent' | 'success' | 'muted'> = {
  pending: 'accent',
  resolved: 'success',
  dismissed: 'muted',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'pending',
  resolved: 'resolved',
  dismissed: 'dismissed',
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
  const t = useTranslations('admin.reports');
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{report.reporterNickname ?? t('unknown')}</span>
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
              {t('resolve')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDismiss(report.id)}>
              {t('dismiss')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const t = useTranslations('admin.reports');
  const [status, setStatus] = useState<string>('pending');
  const [page, setPage] = useState(1);
  const [resolveTarget, setResolveTarget] = useState<ResolveTarget | null>(null);

  const { data, isLoading } = useAdminReports({ page, limit: LIMIT, status });
  const resolveReport = useResolveReport();

  const handleResolve = useCallback(() => {
    if (!resolveTarget) return;
    resolveReport.mutate(resolveTarget, {
      onSuccess: () => {
        toast.success(resolveTarget.status === 'resolved' ? t('resolvedToast') : t('dismissedToast'));
        setResolveTarget(null);
      },
    });
  }, [resolveTarget, resolveReport]);

  return (
    <div>
      <AdminPageHeader title={t('title')} />
      <p className="mb-4 text-xs text-sa-text-muted">{t('hint')}</p>

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
            {t(tab.label)}
          </button>
        ))}
      </div>

      {/* 신고 목록 */}
      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} className="h-24 rounded-xl" />)
          : data?.items.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onResolve={(id) => setResolveTarget({ id, status: 'resolved' })}
                onDismiss={(id) => setResolveTarget({ id, status: 'dismissed' })}
              />
            ))}
        {!isLoading && data?.items.length === 0 && <EmptyState title={t('empty')} />}
      </div>

      <AdminPagination page={page} totalPages={Math.ceil((data?.total ?? 0) / LIMIT)} onPageChange={setPage} />

      <ConfirmDialog
        open={!!resolveTarget}
        onOpenChange={(open) => !open && setResolveTarget(null)}
        title={resolveTarget?.status === 'resolved' ? t('resolveTitle') : t('dismissTitle')}
        description={resolveTarget?.status === 'resolved' ? t('resolveDesc') : t('dismissDesc')}
        confirmLabel={resolveTarget?.status === 'resolved' ? t('resolve') : t('dismiss')}
        variant={resolveTarget?.status === 'resolved' ? 'default' : 'destructive'}
        onConfirm={handleResolve}
        loading={resolveReport.isPending}
      />
    </div>
  );
}
