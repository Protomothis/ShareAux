'use client';

import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useCallback, useState } from 'react';

import type { AuditLogItem } from '@/api/model';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminAuditLogs } from '@/hooks/admin/useAdminAuditLogs';

const ACTION_OPTIONS = [
  { value: '', label: '전체 액션' },
  { value: 'settings_update', label: '설정 변경' },
  { value: 'cleanup', label: '데이터 정리' },
  { value: 'report_resolve', label: '신고 처리' },
  { value: 'role_change', label: '역할 변경' },
  { value: 'ban', label: '밴' },
  { value: 'unban', label: '밴 해제' },
];

const TARGET_OPTIONS = [
  { value: '', label: '전체 대상' },
  { value: 'system', label: '시스템' },
  { value: 'user', label: '유저' },
  { value: 'room', label: '방' },
  { value: 'report', label: '신고' },
];

const ACTION_ICONS: Record<string, string> = {
  settings_update: '⚙️',
  cleanup: '🧹',
  report_resolve: '🚨',
  role_change: '👤',
  ban: '🚫',
  unban: '✅',
};

const LIMIT = 20;

function LogEntry({ log }: { log: AuditLogItem }) {
  const [expanded, setExpanded] = useState(false);
  const icon = ACTION_ICONS[log.action] ?? '📋';
  const time = new Date(log.createdAt).toLocaleString('ko-KR');

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <button type="button" className="flex w-full items-start gap-3 text-left" onClick={() => setExpanded((p) => !p)}>
        <span className="mt-0.5 text-base leading-none">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white">
            <span className="font-medium">{log.actorNickname ?? log.actorId.slice(0, 8)}</span>
            <span className="text-sa-text-muted"> — {log.action}</span>
            {log.targetId && (
              <span className="text-sa-text-muted">
                {' '}
                → {log.targetType}:{log.targetId.slice(0, 8)}
              </span>
            )}
          </p>
          <p className="text-xs text-sa-text-muted">{time}</p>
        </div>
        {log.details &&
          (expanded ? (
            <ChevronUp size={14} className="mt-1 text-sa-text-muted" />
          ) : (
            <ChevronDown size={14} className="mt-1 text-sa-text-muted" />
          ))}
      </button>
      {expanded && log.details && (
        <pre className="mt-2 overflow-x-auto rounded-lg bg-black/30 p-2 text-xs text-sa-text-muted">
          {JSON.stringify(log.details, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');

  const { data, isLoading } = useAdminAuditLogs({
    page,
    limit: LIMIT,
    ...(action && { action }),
    ...(targetType && { targetType }),
  });

  const handleFilterChange = useCallback((setter: (v: string) => void) => {
    return (v: string | null) => {
      setter(v ?? '');
      setPage(1);
    };
  }, []);

  return (
    <div>
      <AdminPageHeader title="📋 감사 로그">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-sa-text-muted" />
          <Select value={action} onValueChange={handleFilterChange(setAction)}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue placeholder="전체 액션" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={targetType} onValueChange={handleFilterChange(setTargetType)}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue placeholder="전체 대상" />
            </SelectTrigger>
            <SelectContent>
              {TARGET_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AdminPageHeader>

      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />
            ))
          : data?.items.map((log) => <LogEntry key={log.id} log={log} />)}
        {!isLoading && data?.items.length === 0 && (
          <p className="py-12 text-center text-sm text-sa-text-muted">감사 로그가 없습니다</p>
        )}
      </div>

      <AdminPagination page={page} totalPages={Math.ceil((data?.total ?? 0) / LIMIT)} onPageChange={setPage} />
    </div>
  );
}
