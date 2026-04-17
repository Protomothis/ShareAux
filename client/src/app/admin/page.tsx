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

function formatUptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
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
      className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
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
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function SystemStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
          <div className="mb-3 h-10 w-10 animate-pulse rounded-xl bg-white/5" />
          <div className="h-9 w-20 animate-pulse rounded-lg bg-white/5" />
          <div className="mt-2 h-4 w-16 animate-pulse rounded-lg bg-white/5" />
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const { data } = useAdminDashboard();
  const { data: sys, isLoading: sysLoading } = useAdminSystemStats();
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const { data: realtime } = useRealtimeMetrics(timeRange);
  const { data: plays } = usePlaysMetrics(7);
  const { data: breakdown } = useUsersBreakdown();

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-white">대시보드</h2>

      {/* 주요 통계 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={Users} label="총 유저" value={data?.totalUsers ?? null} />
        <StatCard icon={DoorOpen} label="활성 방" value={data?.activeRooms ?? null} />
        <StatCard icon={LayoutDashboard} label="총 방" value={data?.totalRooms ?? null} />
      </div>

      {/* 빠른 작업 */}
      <section>
        <h3 className="mb-3 text-sm font-medium text-sa-text-muted">빠른 작업</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            href="/admin/invite-codes"
            icon={Ticket}
            label="초대코드 관리"
            description="초대코드 생성 및 관리"
          />
          <QuickAction href="/admin/users" icon={Users} label="유저 관리" description="유저 목록 및 권한 관리" />
          <QuickAction href="/admin/tracks" icon={Music} label="인기 트랙" description="트랙 순위 확인" />
          <QuickAction href="/admin/rooms" icon={DoorOpen} label="방 관리" description="활성 방 관리 및 삭제" />
          <QuickAction
            href="/admin/invite-codes"
            icon={Trash2}
            label="게스트 정리"
            description="만료된 게스트 계정 삭제"
          />
        </div>
      </section>

      {/* 서버 리소스 */}
      <section>
        <h3 className="mb-3 text-sm font-medium text-sa-text-muted">서버 리소스</h3>
        <MinLoading loading={sysLoading} fallback={<SystemStatsSkeleton />}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard icon={Music} label="ffmpeg 프로세스" value={sys?.ffmpegProcesses ?? null} />
            <StatCard icon={HardDrive} label="프리로드 메모리" value={sys ? `${sys.preloadMemoryMB}MB` : null} />
            <StatCard icon={Cpu} label="Heap 사용" value={sys ? `${sys.heapUsedMB}/${sys.heapTotalMB}MB` : null} />
            <StatCard icon={Activity} label="RSS" value={sys ? `${sys.rssMB}MB` : null} />
            <StatCard icon={Clock} label="업타임" value={sys ? formatUptime(sys.uptimeSec) : null} />
          </div>
        </MinLoading>
      </section>

      {/* 차트 */}
      <section className="space-y-4">
        <ChartCard title="실시간 접속자" action={<TimeRangeToggle value={timeRange} onChange={setTimeRange} />}>
          {realtime?.points?.length ? (
            <RealtimeChart data={realtime.points} timeRange={timeRange} />
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-sa-text-muted">
              데이터 수집 중...
            </div>
          )}
        </ChartCard>

        <ChartCard title="메모리 사용량">
          {realtime?.points?.length ? (
            <ResourceChart data={realtime.points} />
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-sa-text-muted">
              데이터 수집 중...
            </div>
          )}
        </ChartCard>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="일별 재생 수 (7일)">
            {plays?.items?.length ? (
              <DailyPlaysChart data={plays.items} />
            ) : (
              <div className="flex h-[240px] items-center justify-center text-sm text-sa-text-muted">데이터 없음</div>
            )}
          </ChartCard>

          <ChartCard title="유저 분포">
            {breakdown ? (
              <UserDistributionChart byProvider={breakdown.byProvider} byRole={breakdown.byRole} />
            ) : (
              <div className="flex h-[240px] items-center justify-center text-sm text-sa-text-muted">로딩 중...</div>
            )}
          </ChartCard>
        </div>
      </section>
    </div>
  );
}
