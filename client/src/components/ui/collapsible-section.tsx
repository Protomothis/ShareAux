'use client';

import { ChevronDown } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  count?: number;
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  icon,
  count,
  action,
  defaultOpen = true,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-1 py-1.5 text-xs font-medium text-sa-text-secondary transition-colors hover:text-sa-text-primary"
      >
        <ChevronDown size={14} className={cn('transition-transform duration-200', !open && '-rotate-90')} />
        {icon}
        <span className="font-bold uppercase tracking-wider">{title}</span>
        {count != null && <span className="text-sa-text-muted">({count})</span>}
        {action && (
          <span className="ml-auto" onClick={(e) => e.stopPropagation()}>
            {action}
          </span>
        )}
      </button>
      {open && children}
    </div>
  );
}
