'use client';

import { Clock, Database, DoorOpen, HardDrive, Music, Trash2, Users } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import type { CleanupSummaryResponse } from '@/api/model';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { StatCard } from '@/components/admin/StatCard';
import { Button } from '@/components/ui/button';
import { useCleanup, useCleanupSummary } from '@/hooks/admin/useAdminCleanup';

interface CleanupSection {
  type: string;
  label: string;
  description: string;
  countKey: keyof CleanupSummaryResponse;
  icon: string;
}

const CLEANUP_SECTIONS: CleanupSection[] = [
  {
    type: 'unplayed-tracks',
    label: '미재생 트랙',
    description: '한 번도 재생되지 않은 트랙 삭제',
    countKey: 'unplayedTracks',
    icon: '🎵',
  },
  {
    type: 'stale-tracks',
    label: '오래된 트랙 (30일)',
    description: '30일 이상 재생되지 않은 트랙 삭제',
    countKey: 'staleTracksCount',
    icon: '📀',
  },
  {
    type: 'old-histories-30d',
    label: '재생 이력 (30일)',
    description: '30일 이전 재생 이력 삭제',
    countKey: 'oldHistories30d',
    icon: '📜',
  },
  {
    type: 'old-histories-90d',
    label: '재생 이력 (90일)',
    description: '90일 이전 재생 이력 삭제',
    countKey: 'oldHistories90d',
    icon: '📜',
  },
  {
    type: 'inactive-rooms-7d',
    label: '비활성 방 (7일)',
    description: '7일 이상 비활성 방 삭제',
    countKey: 'inactiveRooms7d',
    icon: '🚪',
  },
  {
    type: 'empty-inactive-rooms',
    label: '빈 비활성 방',
    description: '큐가 없는 비활성 방 삭제',
    countKey: 'emptyInactiveRooms',
    icon: '🏚️',
  },
  {
    type: 'expired-guests',
    label: '만료 게스트',
    description: '12시간 이상 된 게스트 삭제',
    countKey: 'expiredGuests',
    icon: '👤',
  },
  {
    type: 'inactive-guests-30d',
    label: '비활성 게스트 (30일)',
    description: '30일 이상 비활성 게스트 삭제',
    countKey: 'inactiveGuests30d',
    icon: '👻',
  },
];

export default function AdminCleanupPage() {
  const { data: summary, isLoading } = useCleanupSummary();
  const cleanup = useCleanup();
  const [confirmType, setConfirmType] = useState<string | null>(null);

  const activeSection = CLEANUP_SECTIONS.find((s) => s.type === confirmType);

  const handleCleanup = useCallback(() => {
    if (!confirmType) return;
    cleanup.mutate(
      { type: confirmType },
      {
        onSuccess: () => {
          toast.success('정리가 완료되었습니다');
          setConfirmType(null);
        },
      },
    );
  }, [confirmType, cleanup]);

  return (
    <div>
      <AdminPageHeader title="🧹 DB 정리" />

      {/* 요약 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={Music} label="총 트랙" value={summary?.totalTracks ?? null} />
        <StatCard icon={Clock} label="총 재생 이력" value={summary?.totalPlayHistories ?? null} />
        <StatCard icon={DoorOpen} label="활성 방" value={summary?.activeRooms ?? null} />
        <StatCard icon={HardDrive} label="비활성 방" value={summary?.inactiveRooms ?? null} />
        <StatCard icon={Users} label="총 유저" value={summary?.totalUsers ?? null} />
        <StatCard icon={Users} label="게스트" value={summary?.guestUsers ?? null} />
        <StatCard icon={Database} label="큐 아이템" value={summary?.totalQueueItems ?? null} />
        <StatCard icon={Music} label="가사 보유" value={summary?.lyricsFoundTracks ?? null} />
      </div>

      {/* 정리 섹션 */}
      <div className="space-y-3">
        {CLEANUP_SECTIONS.map((section) => {
          const count = summary?.[section.countKey] ?? 0;
          return (
            <div
              key={section.type}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{section.icon}</span>
                <div>
                  <p className="text-sm font-medium text-white">{section.label}</p>
                  <p className="text-xs text-sa-text-muted">{section.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium tabular-nums text-sa-text-muted">
                  {isLoading ? '...' : count.toLocaleString()}건
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={count === 0}
                  onClick={() => setConfirmType(section.type)}
                >
                  <Trash2 size={14} className="mr-1" />
                  정리
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!confirmType}
        onOpenChange={(open) => !open && setConfirmType(null)}
        title="데이터 정리"
        description={`${activeSection?.label ?? ''} 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={handleCleanup}
        loading={cleanup.isPending}
      />
    </div>
  );
}
