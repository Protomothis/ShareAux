'use client';

import { Popover } from '@base-ui/react';
import { HelpCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface HelpTipProps {
  children: ReactNode;
  className?: string;
}

export function HelpTip({ children, className }: HelpTipProps) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          'inline-flex size-5 items-center justify-center rounded-full text-white/30 transition-colors hover:bg-white/10 hover:text-white/50 touch-manipulation',
          className,
        )}
      >
        <HelpCircle size={13} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6}>
          <Popover.Popup className="z-50 max-w-64 rounded-lg bg-neutral-800 px-3 py-2.5 text-xs leading-relaxed text-white/80 shadow-lg ring-1 ring-white/10">
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
