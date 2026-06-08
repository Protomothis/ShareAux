import {
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { RoomQueue } from '@/api/model';
import { getQueueControllerGetQueueQueryKey, queueControllerReorder } from '@/api/queue/queue';

export function useQueueDnd(roomId: string, queue: RoomQueue[]) {
  const queryClient = useQueryClient();
  const t = useTranslations('queue');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<RoomQueue[] | null>(null);
  /** 드래그 시작 시점의 queue 스냅샷 — 서버에 보낼 position 기준 */
  const snapshotRef = useRef<RoomQueue[]>([]);
  const overIdRef = useRef<string | null>(null);

  const items = optimistic ?? queue;
  const activeItem = useMemo(() => items.find((q) => q.id === activeId), [items, activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: reorderingId ? Infinity : 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: reorderingId ? 999999 : 150, tolerance: 8 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    snapshotRef.current = [...queue];
    overIdRef.current = null;
    setOptimistic([...queue]);
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    overIdRef.current = String(over.id);
    setOptimistic((prev) => {
      if (!prev) return prev;
      const oldIdx = prev.findIndex((q) => q.id === active.id);
      const newIdx = prev.findIndex((q) => q.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active } = event;
    const overId = overIdRef.current;
    setActiveId(null);
    overIdRef.current = null;
    if (navigator.vibrate) navigator.vibrate(15);

    if (!overId || String(active.id) === overId) {
      setOptimistic(null);
      return;
    }

    const snapshot = snapshotRef.current;
    const fromItem = snapshot.find((q) => q.id === active.id);
    const toItem = snapshot.find((q) => q.id === overId);
    if (!fromItem || !toItem) {
      setOptimistic(null);
      return;
    }

    try {
      setReorderingId(fromItem.id);
      await queueControllerReorder(roomId, {
        queueId: fromItem.id,
        newPosition: toItem.position,
        version: fromItem.version,
      });
    } catch (e) {
      console.warn('[DND] reorder failed', e);
      toast.error(t('reorderFailed'));
    }
    await queryClient.refetchQueries({ queryKey: getQueueControllerGetQueueQueryKey(roomId) });
    setReorderingId(null);
    setOptimistic(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOptimistic(null);
  };

  return {
    items,
    activeItem,
    sensors,
    reorderingId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
