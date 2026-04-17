import { cn } from '@/lib/utils';

interface InfoTagProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent';
  className?: string;
}

export function InfoTag({ children, variant = 'default', className }: InfoTagProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 font-mono text-[9px] uppercase leading-4',
        variant === 'accent'
          ? 'bg-sa-accent/15 font-medium text-sa-accent'
          : 'bg-white/[0.06] text-white/30',
        className,
      )}
    >
      {children}
    </span>
  );
}
