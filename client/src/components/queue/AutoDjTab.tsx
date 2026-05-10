'use client';

import { Check, Loader2, Pause, Play, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { CandidateTrack } from './AutoDjCandidates';
import { AutoDjCandidates } from './AutoDjCandidates';
import type { AutoDjMode } from './AutoDjModeSelect';
import { AutoDjModeSelect } from './AutoDjModeSelect';
import type { AutoDjTags } from './AutoDjTagFilter';
import { AutoDjTagFilter } from './AutoDjTagFilter';

interface AutoDjTabProps {
  mode: AutoDjMode;
  onModeChange: (mode: AutoDjMode) => void;
  /** 일시중지 상태 */
  paused: boolean;
  onTogglePause: () => void;
  /** 서버에 저장된 태그 (초기값) */
  savedTags: AutoDjTags;
  /** 태그+프롬프트 적용 */
  onApply: (tags: AutoDjTags, prompt: string) => void;
  applying?: boolean;
  candidates: CandidateTrack[];
  candidatesLoading?: boolean;
  onPin: (id: string) => void;
  onSkip: (id: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  aiDisabled?: boolean;
  className?: string;
}

export function AutoDjTab({
  mode,
  onModeChange,
  paused,
  onTogglePause,
  savedTags,
  onApply,
  applying,
  candidates,
  candidatesLoading,
  onPin,
  onSkip,
  onRefresh,
  refreshing,
  aiDisabled,
  className,
}: AutoDjTabProps) {
  const t = useTranslations('player.autoDj');
  const [tags, setTags] = useState<AutoDjTags>(savedTags);
  const savedRef = useRef({ tags: savedTags });

  // dirty 감지
  const isDirty = JSON.stringify(tags) !== JSON.stringify(savedRef.current.tags);

  const handleApply = useCallback(() => {
    onApply(tags, '');
    savedRef.current = { tags };
  }, [tags, prompt, onApply]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">🤖 AutoDJ</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onTogglePause}
          className={cn('gap-1.5 text-xs', paused && 'bg-sa-accent/20 text-sa-accent')}
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
          {paused ? t('resume') : t('pause')}
        </Button>
      </div>

      <AutoDjModeSelect value={mode} onChange={onModeChange} aiDisabled={aiDisabled} />

      {mode === 'ai' && (
        <>
          <AutoDjTagFilter value={tags} onChange={setTags} />

          {isDirty && (
            <Button variant="accent" size="sm" onClick={handleApply} loading={applying} className="w-full gap-1.5">
              <Check size={14} />
              {t('apply')}
            </Button>
          )}
        </>
      )}

      {candidates.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">{t('nextUp')}</p>
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onRefresh}
                disabled={refreshing}
                className="text-white/30 hover:text-white/60"
              >
                {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              </Button>
            )}
          </div>
          <AutoDjCandidates candidates={candidates} onPin={onPin} onSkip={onSkip} />
          {candidatesLoading && !candidates.length && (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] p-2">
                  <div className="size-8 shrink-0 animate-pulse rounded bg-white/10" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-white/[0.06]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
