import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T, index?: number) => ReactNode;
  className?: string;
  /** 모바일에서 숨김 */
  hideOnMobile?: boolean;
  /** 모바일에서 primary 행으로 표시 (첫 번째 primary가 메인 텍스트) */
  primary?: boolean;
  /** 고정 너비 (데스크톱) */
  width?: string;
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  skeletonRows?: number;
  rowKey: (item: T) => string;
  emptyMessage?: string;
  maxHeight?: string;
  onRowClick?: (item: T) => void;
  /** 인덱스 오프셋 — 페이지네이션 시 순번 보정 */
  indexOffset?: number;
}

export function AdminTable<T>({
  columns,
  data,
  loading,
  skeletonRows = 5,
  rowKey,
  emptyMessage,
  maxHeight,
  onRowClick,
  indexOffset = 0,
}: AdminTableProps<T>) {
  const tc = useTranslations('admin.common');
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03]">
        {Array.from({ length: skeletonRows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-white/5 px-5 py-4 last:border-0">
            <div className="h-4 w-8 animate-pulse rounded bg-white/5" />
            <div className="flex-1">
              <div className="mb-1.5 h-4 w-2/3 animate-pulse rounded bg-white/5" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-white/5" />
            </div>
            <div className="h-4 w-16 animate-pulse rounded bg-white/5" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-12 text-center text-sm text-sa-text-muted">
        {emptyMessage ?? tc('noData')}
      </div>
    );
  }

  const visibleCols = columns.filter((c) => !c.hideOnMobile);
  const primaryCols = visibleCols.filter((c) => c.primary);
  const secondaryCols = visibleCols.filter((c) => !c.primary);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03]"
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      {/* 데스크톱: 테이블 */}
      <table className="hidden w-full table-fixed text-left text-sm md:table">
        <thead className="sticky top-0 z-10 bg-sa-bg-primary/95 backdrop-blur-sm">
          <tr className="border-b border-white/5">
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={`whitespace-nowrap px-5 py-3 text-xs font-medium uppercase tracking-wider text-sa-text-muted ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {data.map((item, idx) => (
            <tr
              key={rowKey(item)}
              className={`transition hover:bg-white/[0.02] ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-5 py-3 ${col.primary ? 'overflow-hidden' : 'whitespace-nowrap'} ${col.className ?? ''}`}
                >
                  {col.render(item, idx + indexOffset)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 모바일: 컴팩트 리스트 */}
      <div className="divide-y divide-white/5 md:hidden">
        {data.map((item, idx) => (
          <div
            key={rowKey(item)}
            className={`px-4 py-3 ${onRowClick ? 'cursor-pointer' : ''}`}
            onClick={() => onRowClick?.(item)}
          >
            {/* primary 행: 메인 정보 한 줄 */}
            {primaryCols.length > 0 && (
              <div className="flex items-center gap-2">
                {primaryCols.map((col) => (
                  <div key={col.key} className="min-w-0 flex-1 first:flex-none">
                    {col.render(item, idx + indexOffset)}
                  </div>
                ))}
              </div>
            )}
            {/* secondary 행: 라벨-값 쌍 */}
            {secondaryCols.length > 0 && (
              <div
                className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${primaryCols.length > 0 ? 'mt-1.5' : ''}`}
              >
                {secondaryCols.map((col) => (
                  <div key={col.key} className="flex items-center gap-1">
                    {col.header && <span className="text-sa-text-muted">{col.header}:</span>}
                    <span>{col.render(item, idx + indexOffset)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
