'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

export interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface ChatCommandPaletteProps {
  items: PaletteItem[];
  visible: boolean;
  highlightIdx: number;
  onSelect: (item: PaletteItem) => void;
  onClose: () => void;
  emptyLabel?: string;
}

const PALETTE_CLASS =
  'absolute bottom-full left-0 z-30 mb-2 w-56 rounded-xl border border-white/10 bg-sa-bg-elevated/95 shadow-xl backdrop-blur-xl';

export function ChatCommandPalette({
  items,
  visible,
  highlightIdx,
  onSelect,
  onClose: _onClose,
  emptyLabel,
}: ChatCommandPaletteProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current?.children[highlightIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  if (!visible) return null;

  if (items.length === 0) {
    return (
      <div className={cn(PALETTE_CLASS, 'px-3 py-3 text-center text-xs text-sa-text-muted')}>
        {emptyLabel ?? '표시할 항목이 없습니다'}
      </div>
    );
  }

  return (
    <div ref={listRef} role="listbox" className={cn(PALETTE_CLASS, 'max-h-48 overflow-y-auto py-1')}>
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={i === highlightIdx}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(item)}
          className={cn(
            'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm',
            i === highlightIdx ? 'bg-white/10 text-white' : 'text-sa-text-secondary',
          )}
        >
          {item.icon && <span className="flex size-5 shrink-0 items-center justify-center">{item.icon}</span>}
          <span className="truncate font-medium">{item.label}</span>
          {item.description && <span className="ml-auto shrink-0 text-xs text-sa-text-muted">{item.description}</span>}
        </button>
      ))}
    </div>
  );
}
