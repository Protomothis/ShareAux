import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: string[];
  current: number;
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex w-full items-center">
      {steps.map((label, i) => (
        <div key={label} className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}>
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-500',
                i < current && 'bg-sa-accent shadow-[0_0_16px_rgba(var(--sa-accent-rgb),0.35)]',
                i === current &&
                  'border-2 border-sa-accent bg-sa-accent/10 shadow-[0_0_20px_rgba(var(--sa-accent-rgb),0.2)]',
                i > current && 'border border-white/10 bg-white/[0.03]',
              )}
            >
              {i < current ? (
                <Check size={16} strokeWidth={3} className="text-white" />
              ) : (
                <span className={cn('text-xs font-semibold', i === current ? 'text-sa-accent' : 'text-sa-text-muted')}>
                  {i + 1}
                </span>
              )}
            </div>
            <span
              className={cn(
                'whitespace-nowrap text-[11px] transition-colors duration-300',
                i < current && 'font-medium text-sa-accent/80',
                i === current && 'font-semibold text-white',
                i > current && 'text-sa-text-muted/60',
              )}
            >
              {label}
            </span>
          </div>

          {i < steps.length - 1 && (
            <div className="relative mx-3 h-[2px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full bg-sa-accent transition-all duration-700 ease-out',
                  i < current ? 'w-full' : 'w-0',
                )}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
