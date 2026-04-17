export default function RoomSkeleton() {
  return (
    <main className="fixed inset-0 flex flex-col bg-room-gradient">
      <nav className="flex shrink-0 items-center gap-3 px-4 py-3 backdrop-blur-2xl bg-black/60 border-b border-white/10">
        <div className="h-5 w-16 animate-pulse rounded bg-white/10" />
        <div className="h-5 flex-1 animate-pulse rounded bg-white/10" />
      </nav>
      <div className="mx-4 mt-4 rounded-2xl bg-white/5 p-5">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
          <div className="h-10 w-10 animate-pulse rounded-lg bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
          </div>
        </div>
        <div className="mt-3 h-1 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="flex-1 p-4">
        <div className="h-full animate-pulse rounded-2xl bg-white/5" />
      </div>
    </main>
  );
}
