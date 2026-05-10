'use client';

import { cn } from '@/lib/utils';

export interface ChipOption {
  label: string;
  value: string;
  icon?: string;
}

interface ChipSelectProps {
  options: ChipOption[];
  value: string[];
  onChange: (value: string[]) => void;
  /** 단일 선택 모드 */
  single?: boolean;
  className?: string;
}

export function ChipSelect({ options, value, onChange, single, className }: ChipSelectProps) {
  const toggle = (v: string) => {
    if (single) {
      onChange(value.includes(v) ? [] : [v]);
      return;
    }
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((opt) => {
        const selected = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors touch-manipulation',
              selected
                ? 'bg-sa-accent/20 text-sa-accent ring-1 ring-sa-accent/40'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80',
            )}
          >
            {opt.icon && <span>{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
