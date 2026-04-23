import type { LucideIcon } from 'lucide-react';

import { Surface } from '@/components/ui/surface';
import { SkeletonLine } from '@/components/ui/skeleton';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string | null;
}

export function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <Surface padding="lg" className="transition hover:bg-white/[0.05]">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sa-accent/10">
        <Icon size={20} className="text-sa-accent" />
      </div>
      {value !== null ? (
        <>
          <p className="text-3xl font-bold text-white">{value}</p>
          <p className="mt-1 text-sm text-sa-text-muted">{label}</p>
        </>
      ) : (
        <>
          <SkeletonLine className="h-9 w-20" />
          <SkeletonLine className="mt-2 h-4 w-16" />
        </>
      )}
    </Surface>
  );
}
