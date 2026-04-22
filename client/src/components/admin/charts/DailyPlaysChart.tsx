'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { DailyPlaysItem } from '@/api/model';
import { useTranslations } from 'next-intl';

interface DailyPlaysChartProps {
  data: DailyPlaysItem[];
}

export function DailyPlaysChart({ data }: DailyPlaysChartProps) {
  const t = useTranslations('admin.charts');
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={11} />
        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
        />
        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name={t('plays')} />
      </BarChart>
    </ResponsiveContainer>
  );
}
