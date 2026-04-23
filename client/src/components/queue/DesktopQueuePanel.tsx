'use client';

import { History, List } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import TabBar from '@/components/common/TabBar';

import type { FavoriteActions, TrackVoteMap } from '@/types';

import HistoryPanel from './HistoryPanel';
import Queue from './Queue';

type Tab = 'queue' | 'history';

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
}

export default function DesktopQueuePanel(props: DesktopQueuePanelProps) {
  const t = useTranslations('queue');
  const [tab, setTab] = useState<Tab>('queue');

  const tabs = [
    { key: 'queue' as const, icon: <List size={14} />, label: t('tabQueue') },
    { key: 'history' as const, icon: <History size={14} />, label: t('tabHistory') },
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
          className="min-h-0 flex-1 overflow-hidden"
        >
          {tab === 'queue' ? (
            <Queue {...props} />
          ) : (
            <HistoryPanel roomId={props.roomId} isGuest={props.isGuest} favorites={props.favorites} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
