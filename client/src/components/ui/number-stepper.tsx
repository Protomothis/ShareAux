'use client';

import { Minus, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NumberStepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'sm' | 'md';
}

const sizeConfig = {
  sm: { btn: 'h-7 w-7', icon: 12, text: 'text-xs', width: 'w-32' },
  md: { btn: 'h-9 w-9', icon: 14, text: 'text-sm', width: 'w-40' },
};

export default function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  size = 'md',
}: NumberStepperProps) {
  const s = sizeConfig[size];
  const clamp = useCallback((v: number) => Math.min(max, Math.max(min, v)), [min, max]);
  const [draft, setDraft] = useState<string | null>(null);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, '');
      setDraft(raw);
      if (raw !== '') onChange(clamp(Number(raw)));
    },
    [onChange, clamp],
  );

  const handleBlur = useCallback(() => {
    setDraft(null);
    onChange(clamp(value));
  }, [onChange, clamp, value]);

  const display = draft ?? String(value);

  return (
    <div
      className={cn('flex items-center gap-0 overflow-hidden rounded-lg border border-white/10 bg-white/5', s.width)}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        className={cn(
          s.btn,
          'shrink-0 rounded-none text-sa-text-muted hover:bg-white/10 hover:text-white disabled:opacity-30',
        )}
      >
        <Minus size={s.icon} />
      </Button>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleInput}
        onFocus={() => setDraft(String(value))}
        onBlur={handleBlur}
        className={cn(
          'w-full min-w-0 bg-transparent text-center font-medium text-white tabular-nums outline-none',
          s.text,
        )}
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        className={cn(
          s.btn,
          'shrink-0 rounded-none text-sa-text-muted hover:bg-white/10 hover:text-white disabled:opacity-30',
        )}
      >
        <Plus size={s.icon} />
      </Button>
    </div>
  );
}
