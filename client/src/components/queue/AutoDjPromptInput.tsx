'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AutoDjPromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function AutoDjPromptInput({
  value,
  onChange,
  placeholder = '분위기를 직접 입력...',
  className,
}: AutoDjPromptInputProps) {
  const [expanded, setExpanded] = useState(!!value);

  return (
    <div className={cn('space-y-1.5', className)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[11px] text-white/40 transition-colors hover:text-white/60"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        직접 입력
      </button>
      {expanded && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={200}
          className="h-8 rounded-lg border-white/10 bg-white/5 text-xs"
        />
      )}
    </div>
  );
}
