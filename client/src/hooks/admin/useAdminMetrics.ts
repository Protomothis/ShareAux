import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  adminMetricsControllerGetRealtimeMetrics,
  useAdminMetricsControllerGetDailyPlays,
  useAdminMetricsControllerGetStreamingMetrics,
  useAdminMetricsControllerGetUsersBreakdown,
} from '@/api/admin/admin';
import type { MetricsPointDto } from '@/api/model';

export type TimeRange = '1h' | '6h' | '24h';

const TIME_RANGE_MS: Record<TimeRange, number> = {
  '1h': 3_600_000,
  '6h': 21_600_000,
  '24h': 86_400_000,
};

export function useRealtimeMetrics(timeRange: TimeRange) {
  const pointsRef = useRef<MetricsPointDto[]>([]);
  const lastTsRef = useRef(0);
  const prevRangeRef = useRef(timeRange);

  // timeRange 변경 시 캐시 리셋 — useEffect에서 처리
  useEffect(() => {
    if (timeRange !== prevRangeRef.current) {
      pointsRef.current = [];
      lastTsRef.current = 0;
      prevRangeRef.current = timeRange;
    }
  }, [timeRange]);

  const [points, setPoints] = useState<MetricsPointDto[]>([]);

  const fetchAndMerge = useCallback(async () => {
    const since = lastTsRef.current || Date.now() - TIME_RANGE_MS[timeRange];
    const res = await adminMetricsControllerGetRealtimeMetrics({ since: String(since) });
    const newPoints = res.points ?? [];

    if (newPoints.length > 0) {
      const merged = [...pointsRef.current, ...newPoints];
      // 시간 범위 밖 오래된 포인트 제거
      const cutoff = Date.now() - TIME_RANGE_MS[timeRange];
      const trimmed = merged.filter((p) => p.timestamp > cutoff);
      pointsRef.current = trimmed;
      lastTsRef.current = newPoints[newPoints.length - 1].timestamp;
      setPoints(trimmed);
    }

    return pointsRef.current;
  }, [timeRange]);

  useQuery({
    queryKey: ['admin', 'metrics', 'realtime', timeRange],
    queryFn: fetchAndMerge,
    refetchInterval: 10_000,
    staleTime: 9_000,
  });

  return { data: { points } };
}

export function usePlaysMetrics(days: number) {
  return useAdminMetricsControllerGetDailyPlays({ days });
}

export function useUsersBreakdown() {
  return useAdminMetricsControllerGetUsersBreakdown();
}

export function useStreamingMetrics() {
  return useAdminMetricsControllerGetStreamingMetrics({ query: { refetchInterval: 10_000, staleTime: 9_000 } });
}
