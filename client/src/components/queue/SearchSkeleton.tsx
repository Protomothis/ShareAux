export default function SearchSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl p-2">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded bg-white/10" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-white/10" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
      </div>
    </div>
  );
}
