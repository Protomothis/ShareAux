'use client';

import { ChevronDown, ChevronRight, FileText, Search } from 'lucide-react';
import { useState } from 'react';

import type { ErrorFileItem, ErrorLogItem } from '@/api/model';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminErrors, useErrorFile, useErrorFiles } from '@/hooks/admin/useAdminErrors';
import { useTranslations } from 'next-intl';

type Tab = 'memory' | 'files';
type StatusFilter = 'all' | '4xx' | '5xx';

function statusColor(status: number) {
  return status >= 500 ? 'text-rose-400' : status >= 400 ? 'text-amber-400' : 'text-sa-text-muted';
}

function formatTs(ts: number) {
  return new Date(ts).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function filterItems(items: ErrorLogItem[], statusFilter: StatusFilter, pathSearch: string) {
  return items.filter((e) => {
    if (statusFilter === '4xx' && (e.status < 400 || e.status >= 500)) return false;
    if (statusFilter === '5xx' && e.status < 500) return false;
    if (pathSearch && !e.path.toLowerCase().includes(pathSearch.toLowerCase())) return false;
    return true;
  });
}

function ErrorRow({ item }: { item: ErrorLogItem }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="cursor-pointer border-b border-white/5 transition hover:bg-white/[0.03]"
        onClick={() => setOpen(!open)}
      >
        <td className="px-3 py-2.5 text-xs text-sa-text-muted">{formatTs(item.timestamp)}</td>
        <td className="px-3 py-2.5 text-xs font-mono text-white/70">
          {item.method} {item.path}
        </td>
        <td className={`px-3 py-2.5 text-xs font-medium ${statusColor(item.status)}`}>{item.status}</td>
        <td className="max-w-[300px] truncate px-3 py-2.5 text-xs text-sa-text-muted">{item.message}</td>
        <td className="px-3 py-2.5 text-xs text-sa-text-muted">
          {item.stack ? open ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : null}
        </td>
      </tr>
      {open && item.stack && (
        <tr>
          <td colSpan={5} className="bg-black/20 px-4 py-3">
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-rose-300/80">
              {item.stack}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

function ErrorTable({ items }: { items: ErrorLogItem[] }) {
  const t = useTranslations('admin.errors');
  if (!items.length) {
    return <p className="py-12 text-center text-sm text-sa-text-muted">{t('empty')}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/5">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.02]">
            <th className="px-3 py-2 text-xs font-medium text-sa-text-muted">{t('time')}</th>
            <th className="px-3 py-2 text-xs font-medium text-sa-text-muted">{t('path')}</th>
            <th className="px-3 py-2 text-xs font-medium text-sa-text-muted">{t('statusCode')}</th>
            <th className="px-3 py-2 text-xs font-medium text-sa-text-muted">{t('message')}</th>
            <th className="w-8 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <ErrorRow key={`${item.timestamp}-${i}`} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Filters({
  statusFilter,
  onStatusChange,
  pathSearch,
  onPathChange,
}: {
  statusFilter: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
  pathSearch: string;
  onPathChange: (v: string) => void;
}) {
  const t = useTranslations('admin.errors');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {(['all', '4xx', '5xx'] as const).map((v) => (
          <Button
            key={v}
            variant={statusFilter === v ? 'accent' : 'ghost'}
            size="xs"
            onClick={() => onStatusChange(v)}
            className={statusFilter !== v ? 'text-sa-text-muted' : ''}
          >
            {v === 'all' ? '전체' : v}
          </Button>
        ))}
      </div>
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sa-text-muted" />
        <Input
          value={pathSearch}
          onChange={(e) => onPathChange(e.target.value)}
          placeholder={t('pathSearch')}
          className="h-7 w-48 pl-8 text-xs"
        />
      </div>
    </div>
  );
}

function MemoryTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pathSearch, setPathSearch] = useState('');
  const { data } = useAdminErrors({ page, limit: 50 });

  const filtered = data ? filterItems(data.items, statusFilter, pathSearch) : [];
  const totalPages = data ? Math.ceil(data.total / 50) : 1;

  return (
    <div className="space-y-4">
      <Filters
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        pathSearch={pathSearch}
        onPathChange={setPathSearch}
      />
      <ErrorTable items={filtered} />
      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function FileTab() {
  const t = useTranslations('admin.errors');
  const { data: files } = useErrorFiles();
  const [selected, setSelected] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pathSearch, setPathSearch] = useState('');
  const { data: fileData } = useErrorFile(selected, { page, limit: 50 });

  const filtered = fileData ? filterItems(fileData.items, statusFilter, pathSearch) : [];
  const totalPages = fileData ? Math.ceil(fileData.total / 50) : 1;

  function selectFile(f: ErrorFileItem) {
    setSelected(f.filename);
    setPage(1);
  }

  if (!selected) {
    return (
      <div className="space-y-2">
        {!files?.length && <p className="py-12 text-center text-sm text-sa-text-muted">{t('noFiles')}</p>}
        {files?.map((f) => (
          <button
            key={f.filename}
            onClick={() => selectFile(f)}
            className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.05]"
          >
            <FileText size={16} className="text-sa-accent" />
            <div className="flex-1">
              <p className="text-sm text-white">{f.filename}</p>
              <p className="text-xs text-sa-text-muted">
                {f.errorCount}건 · {(f.sizeBytes / 1024).toFixed(1)}KB
              </p>
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="xs" onClick={() => setSelected('')} className="text-sa-text-muted">
          ← 파일 목록
        </Button>
        <span className="text-xs text-white">{selected}</span>
      </div>
      <Filters
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        pathSearch={pathSearch}
        onPathChange={setPathSearch}
      />
      <ErrorTable items={filtered} />
      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

export default function AdminErrorsPage() {
  const t = useTranslations('admin.errors');
  const [tab, setTab] = useState<Tab>('memory');

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('title')} />

      <div className="flex gap-1 rounded-xl bg-white/[0.03] p-1">
        {(
          [
            ['memory', '에러 로그'],
            ['files', '파일 로그'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? 'accent' : 'ghost'}
            size="sm"
            onClick={() => setTab(key)}
            className={tab !== key ? 'text-sa-text-muted' : ''}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'memory' ? <MemoryTab /> : <FileTab />}
    </div>
  );
}
