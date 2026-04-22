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
import { useTranslations } from 'next-intl';

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

function formatSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(mb * 1024).toFixed(0)} KB`;
}

export default function AdminCleanupPage() {
  const t = useTranslations('admin.cleanup');
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
          toast.success(t('done'));
          setConfirmType(null);
        },
      },
    );
  }, [confirmType, cleanup]);

  const totalDB = summary?.tableSizes?.reduce((sum, t) => sum + t.sizeMB, 0) ?? 0;

  return (
    <div>
      <AdminPageHeader title={t('title')} />

      {/* 요약 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={Music} label={t('totalTracks')} value={summary?.totalTracks ?? null} />
        <StatCard icon={Clock} label={t('totalPlayHistories')} value={summary?.totalPlayHistories ?? null} />
        <StatCard icon={DoorOpen} label={t('activeRooms')} value={summary?.activeRooms ?? null} />
        <StatCard icon={HardDrive} label={t('inactiveRooms')} value={summary?.inactiveRooms ?? null} />
        <StatCard icon={Users} label={t('totalUsers')} value={summary?.totalUsers ?? null} />
        <StatCard icon={Users} label={t('guests')} value={summary?.guestUsers ?? null} />
        <StatCard icon={Database} label={t('queueItems')} value={summary?.totalQueueItems ?? null} />
        <StatCard icon={Music} label={t('lyricsFound')} value={summary?.lyricsFoundTracks ?? null} />
      </div>

      {/* 테이블별 용량 */}
      {summary?.tableSizes && summary.tableSizes.length > 0 && (
        <div className="mb-6 rounded-xl border border-white/5 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">{t('tableSize')}</h3>
            <span className="text-xs text-sa-text-muted">전체 {formatSize(totalDB)}</span>
          </div>
          <div className="space-y-1.5">
            {summary.tableSizes.map((t) => (
              <div key={t.name} className="flex items-center justify-between text-xs">
                <span className="font-mono text-sa-text-muted">{t.name}</span>
                <span className="tabular-nums text-white">{formatSize(t.sizeMB)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  {isLoading ? '...' : (count as number).toLocaleString()}건
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
        title={t('cleanTitle')}
        description={`${activeSection?.label ?? ''} 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={handleCleanup}
        loading={cleanup.isPending}
      />
    </div>
  );
}
