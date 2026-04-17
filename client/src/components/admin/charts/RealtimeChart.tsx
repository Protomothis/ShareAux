'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { MetricsPointDto } from '@/api/model';
import type { TimeRange } from '@/hooks/admin/useAdminMetrics';

interface RealtimeChartProps {
  data: MetricsPointDto[];
  timeRange: TimeRange;
}

function formatTime(ts: number, timeRange: TimeRange) {
  const d = new Date(ts);
  return timeRange === '24h'
    ? d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function RealtimeChart({ data, timeRange }: RealtimeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="connGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(v: number) => formatTime(v, timeRange)}
          stroke="rgba(255,255,255,0.5)"
          fontSize={11}
        />
        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          labelFormatter={(v) => formatTime(Number(v), timeRange)}
          labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
        />
        <Area type="monotone" dataKey="connections" stroke="#8b5cf6" fill="url(#connGrad)" name="접속자" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
