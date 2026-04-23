import { SkeletonLine } from '@/components/ui/skeleton';

export default function SearchSkeleton() {
  // import { SkeletonCard, SkeletonLine, SkeletonCircle } from '@/components/ui/skeleton';
  return (
    <div className="flex items-center gap-3 rounded-xl p-2">
      <SkeletonLine className="h-10 w-10 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <SkeletonLine className="h-3.5 w-3/4" />
        <SkeletonLine className="h-3 w-1/2" />
      </div>
    </div>
  );
}
