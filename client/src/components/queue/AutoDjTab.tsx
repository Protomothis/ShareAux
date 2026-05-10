'use client';

import { Check, Loader2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { CandidateTrack } from './AutoDjCandidates';
import { AutoDjCandidates } from './AutoDjCandidates';
import type { AutoDjMode } from './AutoDjModeSelect';
import { AutoDjModeSelect } from './AutoDjModeSelect';
import { AutoDjPromptInput } from './AutoDjPromptInput';
import type { AutoDjTags } from './AutoDjTagFilter';
import { AutoDjTagFilter } from './AutoDjTagFilter';

interface AutoDjTabProps {
  mode: AutoDjMode;
  onModeChange: (mode: AutoDjMode) => void;
  /** 서버에 저장된 태그 (초기값) */
  savedTags: AutoDjTags;
  /** 서버에 저장된 프롬프트 (초기값) */
  savedPrompt: string;
  /** 태그+프롬프트 적용 */
  onApply: (tags: AutoDjTags, prompt: string) => void;
  applying?: boolean;
  candidates: CandidateTrack[];
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
  savedTags,
  savedPrompt,
  onApply,
  applying,
  candidates,
  onPin,
  onSkip,
  onRefresh,
  refreshing,
  aiDisabled,
  className,
}: AutoDjTabProps) {
  const t = useTranslations('player.autoDj');
  const [tags, setTags] = useState<AutoDjTags>(savedTags);
  const [prompt, setPrompt] = useState(savedPrompt);
  const savedRef = useRef({ tags: savedTags, prompt: savedPrompt });

  // dirty 감지
  const isDirty = JSON.stringify(tags) !== JSON.stringify(savedRef.current.tags) || prompt !== savedRef.current.prompt;

  const handleApply = useCallback(() => {
    onApply(tags, prompt);
    savedRef.current = { tags, prompt };
  }, [tags, prompt, onApply]);

  return (
    <div className={cn('space-y-4', className)}>
      <AutoDjModeSelect value={mode} onChange={onModeChange} aiDisabled={aiDisabled} />

      {mode === 'ai' && (
        <>
          <AutoDjTagFilter value={tags} onChange={setTags} />
          <AutoDjPromptInput value={prompt} onChange={setPrompt} />

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
        </div>
      )}
    </div>
  );
}
