'use client';

import { Brain, History, List } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { AutoDjTagsDto } from '@/api/model';
import TabBar from '@/components/common/TabBar';
import { useAutoDj } from '@/hooks/useAutoDj';
import type { AutoDjStatus, FavoriteActions, TrackVoteMap } from '@/types';

import { AutoDjTab } from './AutoDjTab';
import HistoryPanel from './HistoryPanel';
import Queue from './Queue';

type Tab = 'queue' | 'history' | 'autodj';

interface DesktopQueuePanelProps {
  roomId: string;
  canSearch?: boolean;
  canEnqueue?: boolean;
  canReorder?: boolean;
  isHost?: boolean;
  isGuest?: boolean;
  maxSelectPerAdd?: number;
  trackVotes?: TrackVoteMap;
  favorites: FavoriteActions;
  autoDjEnabled?: boolean;
  autoDjMode?: string;
  autoDjPaused?: boolean;
  autoDjTags?: AutoDjTagsDto | null;
  autoDjPrompt?: string | null;
  autoDjStatus?: AutoDjStatus;
}

export default function DesktopQueuePanel(props: DesktopQueuePanelProps) {
  const t = useTranslations('queue');
  const [tab, setTab] = useState<Tab>('queue');

  const autoDj = useAutoDj({
    roomId: props.roomId,
    enabled: !!props.autoDjEnabled && tab === 'autodj',
    isHost: !!props.isHost,
    mode: props.autoDjMode ?? 'related',
    paused: props.autoDjPaused ?? false,
    tags: props.autoDjTags ?? null,
    prompt: props.autoDjPrompt ?? null,
  });

  const tabs = [
    { key: 'queue' as const, icon: <List size={14} />, label: t('tabQueue') },
    { key: 'history' as const, icon: <History size={14} />, label: t('tabHistory') },
    ...(props.autoDjEnabled ? [{ key: 'autodj' as const, icon: <Brain size={14} />, label: t('tabAutoDj') }] : []),
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.06]">
        <TabBar tabs={tabs} activeTab={tab} onTabChange={setTab} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {tab === 'queue' && <Queue {...props} />}
          {tab === 'history' && (
            <HistoryPanel roomId={props.roomId} isGuest={props.isGuest} favorites={props.favorites} />
          )}
          {tab === 'autodj' && <AutoDjTab {...autoDj} className="p-4" />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
