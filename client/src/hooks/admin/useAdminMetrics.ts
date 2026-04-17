import { useCallback, useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import type { MetricsPointDto } from '@/api/model';
import {
  adminControllerGetRealtimeMetrics,
  useAdminControllerGetDailyPlays,
  useAdminControllerGetStreamingMetrics,
  useAdminControllerGetUsersBreakdown,
} from '@/api/admin/admin';

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

  // timeRange 변경 시 캐시 리셋
  if (timeRange !== prevRangeRef.current) {
    pointsRef.current = [];
    lastTsRef.current = 0;
    prevRangeRef.current = timeRange;
  }

  const [points, setPoints] = useState<MetricsPointDto[]>([]);

  const fetchAndMerge = useCallback(async () => {
    const since = lastTsRef.current || Date.now() - TIME_RANGE_MS[timeRange];
    const res = await adminControllerGetRealtimeMetrics({ since: String(since) });
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
  return useAdminControllerGetDailyPlays({ days });
}

export function useUsersBreakdown() {
  return useAdminControllerGetUsersBreakdown();
}

export function useStreamingMetrics() {
  return useAdminControllerGetStreamingMetrics({ query: { refetchInterval: 10_000, staleTime: 9_000 } });
}
