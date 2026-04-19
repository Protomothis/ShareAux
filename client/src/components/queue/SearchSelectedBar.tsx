'use client';

import { ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import { useState } from 'react';

import type { SearchResultItem } from '@/api/model';
import Thumbnail from '@/components/common/Thumbnail';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchSelectedBarProps {
  selected: SearchResultItem[];
  adding: boolean;
  onRemove: (id: string) => void;
  onSubmit: () => void;
}

export function SearchSelectedBar({ selected, adding, onRemove, onSubmit }: SearchSelectedBarProps) {
  const [expanded, setExpanded] = useState(false);

  if (selected.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-white/10 bg-black/90 pt-3">
      {/* 요약 행: 썸네일 미리보기 + 곡 수 + 펼치기 + 제출 */}
      <div className="flex items-center gap-2">
        {/* 썸네일 스택 */}
        <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} className="gap-1.5 px-1">
          <div className="flex -space-x-2">
            {selected.slice(0, 3).map((t) => (
              <Thumbnail
                key={t.sourceId}
                src={t.thumbnail}
                size="sm"
                className="size-7 rounded-md border-2 border-black/90"
              />
            ))}
          </div>
          <span className="text-xs font-medium text-sa-text-secondary">{selected.length}곡</span>
          {expanded ? (
            <ChevronDown size={14} className="text-sa-text-muted" />
          ) : (
            <ChevronUp size={14} className="text-sa-text-muted" />
          )}
        </Button>

        <div className="flex-1" />

        <Button variant="accent" size="sm" disabled={adding} onClick={onSubmit}>
          {adding ? <Loader2 className="size-3.5 animate-spin" /> : null}
          신청하기
        </Button>
      </div>

      {/* 펼친 목록 */}
      {expanded && (
        <div className="mt-2 flex max-h-32 flex-col gap-1 overflow-y-auto">
          {selected.map((track, i) => (
            <div key={track.sourceId} className={cn('flex items-center gap-2 rounded-lg px-2 py-1', 'bg-white/5')}>
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-sa-accent text-[9px] font-bold text-white">
                {i + 1}
              </span>
              <p className="min-w-0 flex-1 truncate text-xs text-white">{track.name}</p>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onRemove(track.sourceId)}
                className="shrink-0 text-white/30 hover:text-white"
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
