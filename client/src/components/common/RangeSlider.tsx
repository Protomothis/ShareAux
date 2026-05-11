'use client';

import { cn } from '@/lib/utils';

interface RangeSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  labelStart?: string;
  labelCenter?: string;
  labelEnd?: string;
  className?: string;
}

export function RangeSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  labelStart,
  labelCenter,
  labelEnd,
  className,
}: RangeSliderProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-sa-accent outline-none [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sa-accent [&::-webkit-slider-thumb]:shadow-md"
      />
      {(labelStart || labelCenter || labelEnd) && (
        <div className="flex justify-between text-[10px] text-white/40">
          <span>{labelStart}</span>
          {labelCenter && <span>{labelCenter}</span>}
          <span>{labelEnd}</span>
        </div>
      )}
    </div>
  );
}
