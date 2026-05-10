'use client';

import { Brain, History, List } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { useAuthControllerGetAuthConfig } from '@/api/auth/auth';
import type { AutoDjCandidateItem, AutoDjCandidatesResponse, AutoDjMode as AutoDjModeEnum } from '@/api/model';
import {
  roomsControllerPinAutoDjCandidate,
  roomsControllerRefreshAutoDjPool,
  roomsControllerSkipAutoDjCandidate,
  roomsControllerToggleAutoDjPause,
  useRoomsControllerGetAutoDjCandidates,
} from '@/api/rooms/rooms';
import TabBar from '@/components/common/TabBar';
import type { FavoriteActions, TrackVoteMap } from '@/types';

import type { AutoDjTags } from './AutoDjTagFilter';
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
  autoDjMode?: AutoDjModeEnum;
  autoDjPaused?: boolean;
  autoDjTags?: AutoDjTags;
  autoDjPrompt?: string;
  autoDjStatus?: import('@/types').AutoDjStatus;
  onRoomUpdate?: (dto: Record<string, unknown>) => void;
}

export default function DesktopQueuePanel(props: DesktopQueuePanelProps) {
  const t = useTranslations('queue');
  const [tab, setTab] = useState<Tab>('queue');
  const [refreshing, setRefreshing] = useState(false);

  const { data: config } = useAuthControllerGetAuthConfig();
  const { data: candidatesData, refetch: refetchCandidates } = useRoomsControllerGetAutoDjCandidates(props.roomId, {
    query: { enabled: props.autoDjEnabled && tab === 'autodj' },
  });

  const handleModeChange = useCallback((mode: AutoDjModeEnum) => props.onRoomUpdate?.({ autoDjMode: mode }), [props]);

  const handleApply = useCallback(
    (tags: AutoDjTags, prompt: string) => {
      props.onRoomUpdate?.({ autoDjTags: tags, autoDjPrompt: prompt });
      setRefreshing(true);
      roomsControllerRefreshAutoDjPool(props.roomId).then(() => {
        refetchCandidates();
        setRefreshing(false);
      });
    },
    [props, refetchCandidates],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await roomsControllerRefreshAutoDjPool(props.roomId);
    await refetchCandidates();
    setRefreshing(false);
  }, [props.roomId, refetchCandidates]);

  const handlePin = useCallback(
    async (trackId: string) => {
      await roomsControllerPinAutoDjCandidate(props.roomId, trackId);
      refetchCandidates();
    },
    [props.roomId, refetchCandidates],
  );

  const handleSkip = useCallback(
    async (trackId: string) => {
      await roomsControllerSkipAutoDjCandidate(props.roomId, trackId);
      refetchCandidates();
    },
    [props.roomId, refetchCandidates],
  );

  const handleTogglePause = useCallback(async () => {
    await roomsControllerToggleAutoDjPause(props.roomId);
    props.onRoomUpdate?.({ autoDjPaused: !props.autoDjPaused });
  }, [props]);

  const tabs = [
    { key: 'queue' as const, icon: <List size={14} />, label: t('tabQueue') },
    { key: 'history' as const, icon: <History size={14} />, label: t('tabHistory') },
    ...(props.autoDjEnabled ? [{ key: 'autodj' as const, icon: <Brain size={14} />, label: 'AutoDJ' }] : []),
  ];

  const candidates: AutoDjCandidateItem[] = (candidatesData as AutoDjCandidatesResponse | undefined)?.candidates ?? [];

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
          {tab === 'autodj' && (
            <AutoDjTab
              mode={(props.autoDjMode ?? 'related') as import('./AutoDjModeSelect').AutoDjMode}
              onModeChange={handleModeChange as (mode: import('./AutoDjModeSelect').AutoDjMode) => void}
              paused={props.autoDjPaused ?? false}
              onTogglePause={handleTogglePause}
              savedTags={props.autoDjTags ?? { mood: [], genre: [], era: [], country: [] }}
              savedPrompt={props.autoDjPrompt ?? ''}
              onApply={handleApply}
              candidates={candidates.map((c) => ({
                id: c.id,
                name: c.name,
                artist: c.artist,
                thumbnail: c.thumbnail,
                pinned: c.pinned,
              }))}
              onPin={handlePin}
              onSkip={handleSkip}
              onRefresh={handleRefresh}
              refreshing={refreshing}
              aiDisabled={!config?.aiDj}
              className="p-4"
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
