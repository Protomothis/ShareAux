'use client';

import { Check, ChevronDown, Loader2, Pause, Play, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { HelpTip } from '@/components/common/HelpTip';

import { Button } from '@/components/common/Button';
import { cn } from '@/lib/utils';

import type { CandidateTrack } from './AutoDjCandidates';
import { AutoDjCandidates } from './AutoDjCandidates';
import type { AutoDjMode } from './AutoDjModeSelect';
import { AutoDjModeSelect } from './AutoDjModeSelect';
import type { AutoDjTags } from './AutoDjTagFilter';
import { AutoDjTagFilter } from './AutoDjTagFilter';

function TagFilterSection({
  tags,
  onChange,
  guide,
}: {
  tags: AutoDjTags;
  onChange: (t: AutoDjTags) => void;
  guide: string;
}) {
  const tp = useTranslations('player.autoDj');
  const [open, setOpen] = useState(true);
  const selectedCount = tags.mood.length + tags.genre.length + tags.era.length + tags.country.length;

  return (
    <div className="space-y-3">
      <p className="rounded-md bg-white/[0.03] px-2.5 py-2 text-[11px] leading-relaxed text-white/40">{guide}</p>
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-2 py-1 touch-manipulation"
        >
          <span className="text-[11px] font-medium text-white/60">{tp('tagSettings')}</span>
          {selectedCount > 0 && (
            <span className="rounded-full bg-sa-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-sa-accent">
              {selectedCount}
            </span>
          )}
          <ChevronDown
            size={12}
            className={cn('ml-auto shrink-0 text-white/30 transition-transform', open && 'rotate-180')}
          />
        </button>
        {open && (
          <div className="pt-2">
            <AutoDjTagFilter value={tags} onChange={onChange} />
          </div>
        )}
      </div>
    </div>
  );
}

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
  onEnqueue: (id: string) => void;
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
  onEnqueue,
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
    <div className={cn('flex h-full flex-col', className)}>
      <div className="shrink-0 space-y-4 border-b border-white/[0.06] px-4 pb-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-white">🤖 AutoDJ</p>
            <HelpTip>{t('helpAutoDj')}</HelpTip>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLocalMode(mode);
                setTags(savedTags);
              }}
              disabled={!isDirty}
              className="text-xs text-white/50 disabled:opacity-0"
            >
              {t('reset')}
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={() => {
                if (isDirty) handleApply();
                if (paused) onTogglePause();
                if (!paused && !isDirty) onTogglePause();
              }}
              loading={applying}
              className="gap-1 text-xs"
            >
              {paused ? <Play size={12} /> : isDirty ? <Check size={12} /> : <Pause size={12} />}
              {paused ? (isDirty ? t('applyAndStart') : t('startAutoDj')) : isDirty ? t('apply') : t('pause')}
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {localMode === 'ai' && <TagFilterSection tags={tags} onChange={setTags} guide={t('aiGuide')} />}

        {!paused && localMode === 'ai' && <div className="my-3 border-t border-white/[0.06]" />}

        <AnimatePresence>
          {!paused && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">{t('nextUp')}</p>
                {onRefresh && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={onRefresh}
                    disabled={refreshing || candidatesLoading}
                    aria-label={t('refresh')}
                    className="text-white/30 hover:text-white/60"
                  >
                    {refreshing || (candidatesLoading && !candidates.length) ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                  </Button>
                )}
              </div>
              <AutoDjCandidates candidates={candidates} onPin={onPin} onSkip={onSkip} onEnqueue={onEnqueue} />
              {(candidatesLoading || !candidates.length) && (
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
