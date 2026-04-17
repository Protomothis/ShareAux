'use client';

import { Button } from '@/components/ui/button';
import type { TimeRange } from '@/hooks/admin/useAdminMetrics';

interface TimeRangeToggleProps {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}

const OPTIONS: TimeRange[] = ['1h', '6h', '24h'];

export function TimeRangeToggle({ value, onChange }: TimeRangeToggleProps) {
  return (
    <div className="flex gap-1">
      {OPTIONS.map((opt) => (
        <Button
          key={opt}
          variant={value === opt ? 'accent' : 'ghost'}
          size="xs"
          onClick={() => onChange(opt)}
          className={value !== opt ? 'text-sa-text-muted hover:text-white' : ''}
        >
          {opt}
        </Button>
      ))}
    </div>
  );
}
