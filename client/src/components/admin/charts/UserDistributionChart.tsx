'use client';

import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/ui/empty-state';

const COLORS = ['#8b5cf6', '#34d399', '#fbbf24', '#fb7185'];

interface PieEntry {
  name: string;
  value: number;
}

interface UserDistributionChartProps {
  byProvider: Record<string, unknown>;
  byRole: Record<string, unknown>;
}

function toPieData(record: Record<string, unknown>): PieEntry[] {
  return Object.entries(record).map(([name, value]) => ({ name, value: Number(value) || 0 }));
}

function MiniPie({ data, title }: { data: PieEntry[]; title: string }) {
  return (
    <div className="flex-1">
      <p className="mb-2 text-center text-xs text-sa-text-muted">{title}</p>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fontSize={11}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {data.map((d, i) => (
          <span key={d.name} className="flex items-center gap-1 text-xs text-sa-text-muted">
            <span className="inline-block size-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            {d.name} ({d.value})
          </span>
        ))}
      </div>
    </div>
  );
}

export function UserDistributionChart({ byProvider, byRole }: UserDistributionChartProps) {
  const t = useTranslations('admin.charts');
  const providerData = useMemo(() => toPieData(byProvider), [byProvider]);
  const roleData = useMemo(() => toPieData(byRole), [byRole]);

  return (
    <div className="flex gap-4">
      <MiniPie data={providerData} title={t('providerTitle')} />
      <MiniPie data={roleData} title={t('roleTitle')} />
    </div>
  );
}
