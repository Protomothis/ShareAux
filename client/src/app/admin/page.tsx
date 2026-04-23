'use client';

import { Activity, Clock, Cpu, DoorOpen, HardDrive, LayoutDashboard, Music, Ticket, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { DailyPlaysChart } from '@/components/admin/charts/DailyPlaysChart';
import { RealtimeChart } from '@/components/admin/charts/RealtimeChart';
import { ResourceChart } from '@/components/admin/charts/ResourceChart';
import { TimeRangeToggle } from '@/components/admin/charts/TimeRangeToggle';
import { UserDistributionChart } from '@/components/admin/charts/UserDistributionChart';
import { MinLoading } from '@/components/common/MinLoading';
import { StatCard } from '@/components/admin/StatCard';
import { useAdminDashboard, useAdminSystemStats } from '@/hooks/admin/useAdminDashboard';
import type { TimeRange } from '@/hooks/admin/useAdminMetrics';
import { usePlaysMetrics, useRealtimeMetrics, useUsersBreakdown } from '@/hooks/admin/useAdminMetrics';
import { useTranslations } from 'next-intl';
import { Surface, surfaceVariants } from '@/components/ui/surface';
import { cn } from '@/lib/utils';
import { SkeletonLine } from '@/components/ui/skeleton';

function formatUptime(sec: number, t: (key: string, values: Record<string, number>) => string): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? t('hourMin', { h, m }) : t('min', { m });
}

interface QuickActionProps {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
}

function QuickAction({ href, icon: Icon, label, description }: QuickActionProps) {
  return (
    <Link
      href={href}
      className={cn(surfaceVariants({ padding: 'sm' }), 'flex items-center gap-3 transition hover:bg-white/[0.05]')}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sa-accent/10">
        <Icon size={18} className="text-sa-accent" />
      </div>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-sa-text-muted">{description}</p>
      </div>
    </Link>
  );
}

function ChartCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Surface>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">{title}</h3>
        {action}
      </div>
      {children}
    </Surface>
  );
}

function SystemStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Surface key={i} padding="lg">
          <SkeletonLine className="mb-3 h-10 w-10 rounded-xl" />
          <SkeletonLine className="h-9 w-20 rounded-lg" />
          <SkeletonLine className="mt-2 h-4 w-16 rounded-lg" />
        </Surface>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const t = useTranslations('admin.dashboard');
  const { data } = useAdminDashboard();
  const { data: sys, isLoading: sysLoading } = useAdminSystemStats();
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const { data: realtime } = useRealtimeMetrics(timeRange);
  const { data: plays } = usePlaysMetrics(7);
  const { data: breakdown } = useUsersBreakdown();

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-white">{t('title')}</h2>

      {/* 주요 통계 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={Users} label={t('totalUsers')} value={data?.totalUsers ?? null} />
        <StatCard icon={DoorOpen} label={t('activeRooms')} value={data?.activeRooms ?? null} />
        <StatCard icon={LayoutDashboard} label={t('totalRooms')} value={data?.totalRooms ?? null} />
      </div>

      {/* {t('quickActions')} */}
      <section>
        <h3 className="mb-3 text-sm font-medium text-sa-text-muted">{t('quickActions')}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            href="/admin/invite-codes"
            icon={Ticket}
            label={t('inviteCodeManage')}
            description={t('inviteCodeManageDesc')}
          />
          <QuickAction href="/admin/users" icon={Users} label={t('userManage')} description={t('userManageDesc')} />
          <QuickAction
            href="/admin/tracks"
            icon={Music}
            label={t('popularTracks')}
            description={t('popularTracksDesc')}
          />
          <QuickAction href="/admin/rooms" icon={DoorOpen} label={t('roomManage')} description={t('roomManageDesc')} />
          <QuickAction
            href="/admin/invite-codes"
            icon={Trash2}
            label={t('guestCleanup')}
            description={t('guestCleanupDesc')}
          />
        </div>
      </section>

      {/* {t('serverResources')} */}
      <section>
        <h3 className="mb-3 text-sm font-medium text-sa-text-muted">{t('serverResources')}</h3>
        <MinLoading loading={sysLoading} fallback={<SystemStatsSkeleton />}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard icon={Music} label={t('ffmpegProcesses')} value={sys?.ffmpegProcesses ?? null} />
            <StatCard icon={HardDrive} label={t('preloadMemory')} value={sys ? `${sys.preloadMemoryMB}MB` : null} />
            <StatCard icon={Cpu} label={t('heapUsage')} value={sys ? `${sys.heapUsedMB}/${sys.heapTotalMB}MB` : null} />
            <StatCard icon={Activity} label="RSS" value={sys ? `${sys.rssMB}MB` : null} />
            <StatCard icon={Clock} label={t('uptime')} value={sys ? formatUptime(sys.uptimeSec, t) : null} />
          </div>
        </MinLoading>
      </section>

      {/* 차트 */}
      <section className="space-y-4">
        <ChartCard
          title={t('realtimeConnections')}
          action={<TimeRangeToggle value={timeRange} onChange={setTimeRange} />}
        >
          {realtime?.points?.length ? (
            <RealtimeChart data={realtime.points} timeRange={timeRange} />
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-sa-text-muted">
              {t('collecting')}
            </div>
          )}
        </ChartCard>

        <ChartCard title={t('memoryUsage')}>
          {realtime?.points?.length ? (
            <ResourceChart data={realtime.points} />
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-sa-text-muted">
              {t('collecting')}
            </div>
          )}
        </ChartCard>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title={t('dailyPlays')}>
            {plays?.items?.length ? (
              <DailyPlaysChart data={plays.items} />
            ) : (
              <div className="flex h-[240px] items-center justify-center text-sm text-sa-text-muted">
                {t('noChartData')}
              </div>
            )}
          </ChartCard>

          <ChartCard title={t('userDistribution')}>
            {breakdown ? (
              <UserDistributionChart byProvider={breakdown.byProvider} byRole={breakdown.byRole} />
            ) : (
              <div className="flex h-[240px] items-center justify-center text-sm text-sa-text-muted">
                {t('loading')}
              </div>
            )}
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
