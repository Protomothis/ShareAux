'use client';

import { cn } from '@/lib/utils';

export interface TabItem<T extends string> {
  key: T;
  icon: React.ReactNode;
  label: string;
}

interface TabBarProps<T extends string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  variant?: 'pill' | 'bottom';
}

export default function TabBar<T extends string>({ tabs, activeTab, onTabChange, variant = 'pill' }: TabBarProps<T>) {
  if (variant === 'bottom') {
    return (
      <nav className="flex shrink-0 select-none border-t border-white/10 bg-black/60 backdrop-blur-2xl">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-colors',
              activeTab === t.key ? 'text-sa-accent' : 'text-sa-text-muted',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>
    );
  }

  return (
    <div className="flex shrink-0 gap-1 px-3 pt-2">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onTabChange(t.key)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            activeTab === t.key ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white/60',
          )}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}
