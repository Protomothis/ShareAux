'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'motion/react';
import { GripVertical, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { RoomQueue } from '@/api/model';
import { Button } from '@/components/ui/button';
import type { ShimmerVariant, TrackVoteMap } from '@/types';

import QueueTrackItem from './QueueTrackItem';
import TrackVoteButtons from './TrackVoteButtons';

/** 각 아이템 사이 순차 딜레이 (ms) — spring 애니메이션 체감 완료 시간 기준 */
const STAGGER_DELAY_MS = 450;

interface SortableItemProps {
  item: RoomQueue;
  onRemove?: () => void;
  reorderingId?: string | null;
  removingId?: string | null;
  canReorder?: boolean;
  roomId: string;
  trackVotes?: TrackVoteMap;
  shimmer?: ShimmerVariant;
  staggerIndex?: number;
}

export default function SortableItem({
  item,
  onRemove,
  reorderingId,
  removingId,
  canReorder,
  roomId,
  trackVotes,
  shimmer,
  staggerIndex,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const isReordering = reorderingId === item.id;
  const isRemoving = removingId === item.id;
  const isNew = staggerIndex !== undefined;

  // 타이머 기반 순차 reveal — 이전 아이템 애니메이션 체감 완료 후 다음 시작
  const [revealed, setRevealed] = useState(!isNew);
  useEffect(() => {
    if (!isNew) return;
    const timer = setTimeout(() => setRevealed(true), staggerIndex * STAGGER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isNew, staggerIndex]);

  return (
    <motion.div
      ref={setNodeRef}
      role="listitem"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      initial={isNew ? { opacity: 0, x: 40, height: 0, scale: 0.9 } : false}
      animate={revealed ? { opacity: 1, x: 0, height: 'auto', scale: 1 } : { opacity: 0, x: 40, height: 0, scale: 0.9 }}
      exit={{ opacity: 0, x: -40, height: 0, scale: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 22,
        mass: 0.8,
        height: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
      }}
      className={`overflow-hidden ${shimmer && revealed ? `animate-queue-shimmer shimmer-${shimmer}` : ''}`}
    >
      <QueueTrackItem
        item={item}
        className={`${isDragging ? 'opacity-30' : ''} ${isReordering ? 'pointer-events-none opacity-60' : 'hover:bg-white/[0.06]'}`}
        leading={
          canReorder ? (
            isReordering ? (
              <Loader2 size={14} className="shrink-0 animate-spin text-sa-accent" />
            ) : (
              <div
                className="flex max-md:-ml-2 max-md:h-11 max-md:w-11 md:h-6 md:w-6 shrink-0 cursor-grab items-center justify-center touch-none"
                {...attributes}
                {...listeners}
              >
                <GripVertical
                  size={16}
                  className="text-sa-text-muted md:opacity-0 md:transition-opacity md:group-hover/item:opacity-100"
                />
              </div>
            )
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-0.5">
            <TrackVoteButtons trackId={item.track.id} roomId={roomId} votes={trackVotes?.get(item.track.id)} />
            {onRemove &&
              (isRemoving ? (
                <Loader2 size={13} className="shrink-0 animate-spin text-sa-accent" />
              ) : (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={onRemove}
                  className="text-sa-text-muted max-md:opacity-100 md:opacity-0 transition-opacity group-hover/item:opacity-100 hover:text-red-400"
                >
                  <Trash2 size={13} />
                </Button>
              ))}
          </div>
        }
      />
    </motion.div>
  );
}
