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

export function ChatCommandPalette({ items, visible, highlightIdx, onSelect, onClose, emptyLabel }: ChatCommandPaletteProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // 하이라이트된 아이템 스크롤
  useEffect(() => {
    const el = listRef.current?.children[highlightIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  if (!visible) return null;

  if (items.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 z-30 mb-2 rounded-xl border border-white/10 bg-sa-bg-elevated/95 px-3 py-3 text-center text-xs text-sa-text-muted shadow-xl backdrop-blur-xl">
        {emptyLabel ?? '표시할 항목이 없습니다'}
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      role="listbox"
      className="absolute bottom-full left-0 right-0 z-30 mb-2 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-sa-bg-elevated/95 py-1 shadow-xl backdrop-blur-xl"
    >
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={i === highlightIdx}
          onMouseEnter={() => {
            /* highlight는 외부에서 관리 */
          }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(item)}
          className={cn(
            'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm',
            i === highlightIdx ? 'bg-white/10 text-white' : 'text-sa-text-secondary',
          )}
        >
          {item.icon && <span className="flex size-5 shrink-0 items-center justify-center">{item.icon}</span>}
          <span className="font-medium">{item.label}</span>
          {item.description && <span className="ml-auto text-xs text-sa-text-muted">{item.description}</span>}
        </button>
      ))}
    </div>
  );
}
