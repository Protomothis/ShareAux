'use client';

import { cn } from '@/lib/utils';

import type { ChipOption } from './chip-select';
import { ChipSelect } from './chip-select';

interface ChipGroupProps {
  title: string;
  options: ChipOption[];
  value: string[];
  onChange: (value: string[]) => void;
  single?: boolean;
  className?: string;
}

export function ChipGroup({ title, options, value, onChange, single, className }: ChipGroupProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">{title}</p>
      <ChipSelect options={options} value={value} onChange={onChange} single={single} />
    </div>
  );
}
