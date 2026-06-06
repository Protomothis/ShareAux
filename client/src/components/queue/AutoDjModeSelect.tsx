'use client';

import { BarChart3, Brain, Heart, History, Radio, Shuffle, Sparkles, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type AutoDjMode = 'related' | 'radio' | 'history' | 'popular' | 'mixed' | 'favorites' | 'ai' | 'chart';

interface ModeOption {
  value: AutoDjMode;
  label: string;
  icon: ReactNode;
}

const modes: ModeOption[] = [
  { value: 'related', label: 'Related', icon: <Sparkles size={12} /> },
  { value: 'radio', label: 'Radio', icon: <Radio size={12} /> },
  { value: 'history', label: 'History', icon: <History size={12} /> },
  { value: 'popular', label: 'Popular', icon: <TrendingUp size={12} /> },
  { value: 'mixed', label: 'Mixed', icon: <Shuffle size={12} /> },
  { value: 'favorites', label: 'Favorites', icon: <Heart size={12} /> },
  { value: 'ai', label: 'AI', icon: <Brain size={12} /> },
  { value: 'chart', label: 'Chart', icon: <BarChart3 size={12} /> },
];

interface AutoDjModeSelectProps {
  value: AutoDjMode;
  onChange: (mode: AutoDjMode) => void;
  /** AI 모드 비활성화 (서버 미설정 시) */
  aiDisabled?: boolean;
  className?: string;
}

export function AutoDjModeSelect({ value, onChange, aiDisabled, className }: AutoDjModeSelectProps) {
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {modes.map((mode) => {
        const disabled = mode.value === 'ai' && aiDisabled;
        const selected = value === mode.value;
        return (
          <button
            key={mode.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(mode.value)}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors touch-manipulation',
              selected
                ? 'bg-sa-accent/20 text-sa-accent ring-1 ring-sa-accent/40'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70',
              disabled && 'pointer-events-none opacity-30',
            )}
          >
            {mode.icon}
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
