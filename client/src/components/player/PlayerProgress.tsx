import { formatDuration } from '@/lib/format';

interface PlayerProgressProps {
  elapsed: number;
  duration: number;
  progress: number;
  showTime?: boolean;
}

export default function PlayerProgress({ elapsed, duration, progress, showTime = true }: PlayerProgressProps) {
  return (
    <div className="select-none px-4">
      <div
        className="group relative h-1 w-full cursor-pointer overflow-hidden rounded-full bg-white/[0.08]"
        role="progressbar"
        aria-valuenow={Math.round(elapsed)}
        aria-valuemax={duration}
      >
        <div
          className="absolute inset-0 h-full rounded-full bg-gradient-to-r from-sa-accent to-sa-accent-hover transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        >
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            style={{ animation: 'shimmer 3s ease-in-out infinite' }}
          />
          <div className="absolute right-0 top-1/2 size-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-white opacity-0 shadow-md transition group-hover:opacity-100" />
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-white/25">
        <span>{showTime ? formatDuration(elapsed) : ''}</span>
        <span>{showTime ? formatDuration(duration) : ''}</span>
      </div>
    </div>
  );
}
