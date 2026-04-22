'use client';

import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { GripVertical, Loader2, Search } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { RoomQueue } from '@/api/model';
import { getQueueControllerGetQueueQueryKey, queueControllerRemoveTrack } from '@/api/queue/queue';
import { useQueueControllerGetMyQuota, useQueueControllerGetQueue } from '@/api/queue/queue';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/EmptyState';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useInvalidate } from '@/hooks/useQueries';
import { useQueueDnd } from '@/hooks/useQueueDnd';
import { MAX_QUEUE_SIZE } from '@/lib/constants';
import type { AutoDjStatus, FavoriteActions, TrackVoteMap } from '@/types';

import QueueTrackItem from './QueueTrackItem';
import SearchModal from './SearchModal';
import SortableItem from './SortableItem';

// Queue 컴포넌트

function OverlayItem({ item }: { item: RoomQueue }) {
  return (
    <div className="scale-[0.97] opacity-90">
      <QueueTrackItem
        item={item}
        className="rounded-xl border border-sa-accent/30 bg-sa-bg-elevated/95 shadow-[0_8px_30px_rgba(255,64,129,0.15)] backdrop-blur-xl"
        leading={<GripVertical size={16} className="shrink-0 text-sa-accent" />}
      />
    </div>
  );
}

interface QueueProps {
  roomId: string;
  canSearch?: boolean;
  canEnqueue?: boolean;
  canReorder?: boolean;
  isHost?: boolean;
  isGuest?: boolean;
  maxSelectPerAdd?: number;
  trackVotes?: TrackVoteMap;
  autoDjStatus?: AutoDjStatus;
  favorites: FavoriteActions;
}

export default function Queue({
  roomId,
  canSearch = true,
  canEnqueue = true,
  canReorder = false,
  isHost = false,
  isGuest = false,
  maxSelectPerAdd = 3,
  trackVotes,
  autoDjStatus = 'idle',
  favorites,
}: QueueProps) {
  const { data: queue = [] } = useQueueControllerGetQueue(roomId);
  const { data: quota } = useQueueControllerGetMyQuota(roomId);
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();
  const t = useTranslations('queue');
  const [searchOpen, setSearchOpen] = useState(false);
  const { favoriteIds, favLoadingIds, toggleFavorite } = favorites;
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  // 이미 본 아이템 ID 추적 — shimmer/stagger는 처음 나타날 때만
  const seenIdsRef = useRef<Set<string>>(null);
  if (!seenIdsRef.current) {
    seenIdsRef.current = new Set(queue.map((q) => q.id));
  }
  const staggerMap = useMemo(() => {
    const seen = seenIdsRef.current!;
    const stagger = new Map<string, number>();
    let idx = 0;
    for (const q of queue) {
      if (!seen.has(q.id)) {
        stagger.set(q.id, idx++);
        seen.add(q.id);
      }
    }
    return stagger;
  }, [queue]);

  const dnd = useQueueDnd(roomId, queue);
  const busy = !!dnd.reorderingId || !!removingId;

  const handleRemove = async (queueId: string) => {
    setConfirmRemoveId(null);
    setRemovingId(queueId);
    // optimistic: 즉시 UI에서 제거
    const queryKey = getQueueControllerGetQueueQueryKey(roomId);
    const prev = queryClient.getQueryData<RoomQueue[]>(queryKey);
    queryClient.setQueryData<RoomQueue[]>(queryKey, (old) => old?.filter((q) => q.id !== queueId) ?? []);
    try {
      await queueControllerRemoveTrack(roomId, queueId);
      invalidate.history(roomId);
    } catch {
      // rollback
      if (prev) queryClient.setQueryData(queryKey, prev);
    }
    setRemovingId(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">
              {t('title')}{' '}
              <span className="font-normal text-white/40">
                {queue.length}/{MAX_QUEUE_SIZE}
              </span>
            </h2>
            {quota &&
              !quota.unlimited &&
              (quota.banned ? (
                <span className="rounded bg-red-400/10 px-1.5 py-0.5 text-xs text-red-400">{t('enqueueDisabled')}</span>
              ) : (
                <span
                  className={`rounded px-1.5 py-0.5 text-xs ${quota.used >= quota.limit ? 'bg-red-400/10 text-red-400' : 'bg-white/5 text-sa-text-secondary'}`}
                >
                  {t('quota', { used: quota.used, limit: quota.limit, windowMin: quota.windowMin })}
                </span>
              ))}
          </div>
          {canSearch && (
            <Button variant="accent-ghost" size="sm" onClick={() => setSearchOpen(true)} className="gap-1.5">
              <Search size={13} /> {t('addTrack')}
            </Button>
          )}
        </div>

        {queue.length === 0 ? (
          <EmptyState
            icon="🎵"
            title={t('emptyTitle')}
            description={t('emptyDescription')}
            action={
              canSearch ? (
                <Button variant="accent" size="sm" onClick={() => setSearchOpen(true)} className="mx-auto gap-1.5">
                  <Search size={14} /> {t('addTrack')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DndContext
            sensors={dnd.sensors}
            collisionDetection={closestCenter}
            onDragStart={dnd.handleDragStart}
            onDragOver={dnd.handleDragOver}
            onDragEnd={dnd.handleDragEnd}
            onDragCancel={dnd.handleDragCancel}
          >
            <SortableContext items={dnd.items.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <div
                className={`min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-1 ${busy ? 'pointer-events-none' : ''}`}
                role="list"
              >
                <AnimatePresence initial={false}>
                  {dnd.items.map((item) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      onRemove={() => setConfirmRemoveId(item.id)}
                      reorderingId={dnd.reorderingId}
                      removingId={removingId}
                      canReorder={canReorder}
                      roomId={roomId}
                      trackVotes={trackVotes}
                      shimmer={staggerMap.has(item.id) ? (item.isAutoDj ? 'accent' : 'white') : undefined}
                      staggerIndex={staggerMap.get(item.id)}
                      isFavorite={favoriteIds.has(item.track.sourceId)}
                      favLoading={favLoadingIds.has(item.track.sourceId)}
                      onToggleFavorite={() =>
                        toggleFavorite({
                          provider: item.track
                            .provider as unknown as import('@/api/model').SearchResultItem['provider'],
                          sourceId: item.track.sourceId,
                          name: item.track.name,
                          artist: item.track.artist ?? null,
                          thumbnail: item.track.thumbnail ?? null,
                          durationMs: item.track.durationMs,
                        })
                      }
                      isGuest={isGuest}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {dnd.activeItem ? <OverlayItem item={dnd.activeItem} /> : null}
            </DragOverlay>
          </DndContext>
        )}

        <AnimatePresence>
          {autoDjStatus !== 'idle' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-center gap-2 py-2 text-xs text-white/30">
                <span className="animate-pulse">🤖</span>
                <span>{autoDjStatus === 'thinking' ? t('autoDjThinking') : t('autoDjAdding')}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        roomId={roomId}
        canEnqueue={canEnqueue}
        queueTrackIds={quota?.blockedSourceIds ?? []}
        onTrackAdded={() => {
          invalidate.queue(roomId);
          invalidate.quota(roomId);
          invalidate.history(roomId);
          invalidate.player(roomId);
        }}
        maxSelectPerAdd={maxSelectPerAdd}
        isHost={isHost}
        isGuest={isGuest}
        favorites={favorites}
      />

      <Dialog open={!!confirmRemoveId} onOpenChange={(open) => !open && setConfirmRemoveId(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{t('deleteConfirm')}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemoveId(null)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={() => confirmRemoveId && handleRemove(confirmRemoveId)}>
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
