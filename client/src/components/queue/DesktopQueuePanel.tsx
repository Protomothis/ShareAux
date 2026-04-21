'use client';

import { History, List } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

import type { TabItem } from '@/components/common/TabBar';
import TabBar from '@/components/common/TabBar';

import type { FavoriteActions, TrackVoteMap } from '@/types';

import HistoryPanel from './HistoryPanel';
import Queue from './Queue';

type Tab = 'queue' | 'history';

const TABS: TabItem<Tab>[] = [
  { key: 'queue', icon: <List size={14} />, label: '신청곡' },
  { key: 'history', icon: <History size={14} />, label: '재생 기록' },
];

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
  const [tab, setTab] = useState<Tab>('queue');

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.06]">
        <TabBar tabs={TABS} activeTab={tab} onTabChange={setTab} />
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
