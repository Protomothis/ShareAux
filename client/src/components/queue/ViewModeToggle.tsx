'use client';

import { LayoutGrid, LayoutList } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ViewMode } from '@/stores/preferences';
import { usePreferencesStore } from '@/stores/preferences';

export function ViewModeToggle() {
  const viewMode = usePreferencesStore((s) => s.viewMode);
  const setViewMode = usePreferencesStore((s) => s.setViewMode);

  const btn = (mode: ViewMode, Icon: typeof LayoutGrid) => (
    <button
      type="button"
      onClick={() => setViewMode(mode)}
      className={cn(
        'rounded p-1 transition-colors',
        viewMode === mode ? 'text-sa-accent' : 'text-white/30 hover:text-white/60',
      )}
    >
      <Icon size={14} />
    </button>
  );

  return (
    <div className="flex items-center gap-0.5">
      {btn('grid', LayoutGrid)}
      {btn('list', LayoutList)}
    </div>
  );
}
