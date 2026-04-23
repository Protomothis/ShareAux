import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function SkeletonLine({ className }: SkeletonProps) {
  return <div className={cn('h-3 animate-pulse rounded bg-white/[0.06]', className)} />;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return <div className={cn('h-32 animate-pulse rounded-2xl border border-white/5 bg-white/5', className)} />;
}

export function SkeletonCircle({ className }: SkeletonProps) {
  return <div className={cn('h-10 w-10 animate-pulse rounded-full bg-white/10', className)} />;
}
