'use client';

import { Check, Loader2, Pause, Play, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { HelpTip } from '@/components/common/HelpTip';

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
  const [localMode, setLocalMode] = useState(mode);
  const [tags, setTags] = useState<AutoDjTags>(savedTags);
  const savedRef = useRef({ mode, tags: savedTags });

  // dirty 감지
  const isDirty = localMode !== savedRef.current.mode || JSON.stringify(tags) !== JSON.stringify(savedRef.current.tags);

  const handleApply = useCallback(() => {
    if (localMode !== savedRef.current.mode) onModeChange(localMode);
    if (localMode === 'ai') onApply(tags, '');
    savedRef.current = { mode: localMode, tags };
  }, [localMode, tags, onApply, onModeChange]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-white">🤖 AutoDJ</p>
          <HelpTip>{t('helpAutoDj')}</HelpTip>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="accent"
            size="sm"
            onClick={handleApply}
            disabled={!isDirty}
            loading={applying}
            className="gap-1 text-xs"
          >
            <Check size={12} />
            {t('apply')}
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={onTogglePause} className={cn(paused && 'text-sa-accent')}>
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </Button>
        </div>
      </div>

      <AutoDjModeSelect value={localMode} onChange={setLocalMode} aiDisabled={aiDisabled} />

      {localMode !== 'ai' && (
        <p className="text-[11px] leading-relaxed text-white/40">
          {localMode === 'related' && t('guideRelated')}
          {localMode === 'radio' && t('guideRadio')}
          {localMode === 'history' && t('guideHistory')}
          {localMode === 'popular' && t('guidePopular')}
          {localMode === 'mixed' && t('guideMixed')}
          {localMode === 'favorites' && t('guideFavorites')}
        </p>
      )}

      {localMode === 'ai' && (
        <>
          <p className="text-[11px] leading-relaxed text-white/40">{t('aiGuide')}</p>
          <AutoDjTagFilter value={tags} onChange={setTags} />
        </>
      )}

      {(candidates.length > 0 || candidatesLoading) && (
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
