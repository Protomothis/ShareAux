'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { MetricsPointDto } from '@/api/model';

interface ResourceChartProps {
  data: MetricsPointDto[];
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export function ResourceChart({ data }: ResourceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="rgba(255,255,255,0.5)" fontSize={11} />
        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} unit="MB" />
        <Tooltip
          contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
          labelFormatter={(v) => formatTime(Number(v))}
          labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
        />
        <Legend verticalAlign="top" height={30} />
        <Line type="monotone" dataKey="heapUsedMB" stroke="#34d399" dot={false} name="Heap" />
        <Line type="monotone" dataKey="rssMB" stroke="#fbbf24" dot={false} name="RSS" />
        <Line type="monotone" dataKey="preloadMemoryMB" stroke="#8b5cf6" dot={false} name="Preload" />
      </LineChart>
    </ResponsiveContainer>
  );
}
