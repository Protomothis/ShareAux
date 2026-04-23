import { SkeletonCircle, SkeletonLine } from '@/components/ui/skeleton';

export default function RoomSkeleton() {
  return (
    <main className="fixed inset-0 flex flex-col bg-room-gradient">
      <nav className="flex shrink-0 items-center gap-3 px-4 py-3 backdrop-blur-2xl bg-black/60 border-b border-white/10">
        <SkeletonLine className="h-5 w-16" />
        <SkeletonLine className="h-5 flex-1" />
      </nav>
      <div className="mx-4 mt-4 rounded-2xl bg-white/5 p-5">
        <div className="flex items-center gap-4">
          <SkeletonCircle />
          <SkeletonLine className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <SkeletonLine className="h-4 w-3/4" />
            <SkeletonLine className="h-3 w-1/2" />
          </div>
        </div>
        <SkeletonLine className="mt-3 h-1 rounded-full" />
      </div>
      <div className="flex-1 p-4">
        <SkeletonLine className="h-full rounded-2xl" />
      </div>
    </main>
  );
}
