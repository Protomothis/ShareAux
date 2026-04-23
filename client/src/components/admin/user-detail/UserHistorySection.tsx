import { EmptyState } from '@/components/ui/empty-state';
import { Music, User as UserIcon } from 'lucide-react';

import type { UserDetailResponse } from '@/api/model';
import { StatCard } from '@/components/admin/StatCard';
import { useTranslations } from 'next-intl';

interface UserHistorySectionProps {
  user: UserDetailResponse;
}

export function UserHistorySection({ user }: UserHistorySectionProps) {
  const t = useTranslations('admin.userDetail');
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={Music} label={t('totalPlays')} value={user.totalPlays} />
        <StatCard icon={UserIcon} label={t('roomCount')} value={user.roomCount} />
        <StatCard icon={Music} label={t('trackCount')} value={user.recentTracks.length} />
      </div>

      <h3 className="mb-3 text-sm font-medium text-sa-text-muted">{t('recentHistory')}</h3>
      {user.recentTracks.length === 0 ? (
        <EmptyState title={t('noHistory')} />
      ) : (
        <div className="space-y-2">
          {user.recentTracks.map((tr) => (
            <div
              key={tr.trackId}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium text-white">{tr.name}</div>
                <div className="text-xs text-sa-text-muted">
                  {new Date(tr.lastPlayedAt).toLocaleDateString('ko-KR')}
                </div>
              </div>
              <span className="rounded-lg bg-white/5 px-2 py-1 text-xs text-sa-text-muted">
                {t('playCount', { count: tr.playCount })}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
