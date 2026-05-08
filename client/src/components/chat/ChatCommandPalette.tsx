'use client';

import { useEffect, useRef, useState } from 'react';

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
  onSelect: (item: PaletteItem) => void;
  onClose: () => void;
  /** 외부에서 키보드 이벤트 전달 — true 반환 시 이벤트 소비됨 */
  filter?: string;
}

export function ChatCommandPalette({ items, visible, onSelect, onClose, filter = '' }: ChatCommandPaletteProps) {
  const [highlightIdx, setHighlightIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = filter
    ? items.filter((item) => item.label.toLowerCase().includes(filter.toLowerCase()))
    : items;

  // 필터 변경 시 하이라이트 리셋
  useEffect(() => {
    setHighlightIdx(0);
  }, [filter]);

  // 하이라이트된 아이템 스크롤
  useEffect(() => {
    const el = listRef.current?.children[highlightIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  /** 키보드 이벤트 핸들러 — ChatInput에서 호출 */
  const handleKeyDown = (e: React.KeyboardEvent): boolean => {
    if (!visible || filtered.length === 0) return false;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % filtered.length);
      return true;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => (i <= 0 ? filtered.length - 1 : i - 1));
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      onSelect(filtered[highlightIdx]);
      return true;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return true;
    }
    return false;
  };

  if (!visible || filtered.length === 0) return null;

  return (
    <div
      ref={listRef}
      role="listbox"
      className="absolute bottom-full left-0 right-0 z-30 mb-2 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-sa-bg-elevated/95 py-1 shadow-xl backdrop-blur-xl"
    >
      {filtered.map((item, i) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={i === highlightIdx}
          onMouseEnter={() => setHighlightIdx(i)}
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

export { type ChatCommandPaletteProps };
