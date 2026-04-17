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
import { useMemo, useRef, useState } from 'react';

import type { RoomQueue } from '@/api/model';
import { getQueueControllerGetQueueQueryKey, queueControllerReorder } from '@/api/queue/queue';

export function useQueueDnd(roomId: string, queue: RoomQueue[]) {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<RoomQueue[] | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const overIdRef = useRef<string | null>(null);

  const items = localOrder ?? queue;
  const activeItem = useMemo(() => items.find((q) => q.id === activeId), [items, activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: reorderingId ? Infinity : 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: reorderingId ? 999999 : 150, tolerance: 8 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setLocalOrder([...queue]);
    overIdRef.current = null;
    // 햅틱 피드백
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !localOrder) return;
    overIdRef.current = String(over.id);
    setOverId(String(over.id));
    const oldIdx = localOrder.findIndex((q) => q.id === active.id);
    const newIdx = localOrder.findIndex((q) => q.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) setLocalOrder(arrayMove(localOrder, oldIdx, newIdx));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const draggedId = String(event.active.id);
    const droppedOnId = overIdRef.current;
    setActiveId(null);
    overIdRef.current = null;
    setOverId(null);
    if (navigator.vibrate) navigator.vibrate(15);
    if (!droppedOnId || draggedId === droppedOnId) {
      setLocalOrder(null);
      return;
    }
    const fromItem = queue.find((q) => q.id === draggedId);
    const toItem = queue.find((q) => q.id === droppedOnId);
    if (!fromItem || !toItem) {
      setLocalOrder(null);
      return;
    }
    try {
      setReorderingId(fromItem.id);
      await queueControllerReorder(roomId, {
        queueId: fromItem.id,
        newPosition: toItem.position,
        version: fromItem.version,
      });
      await queryClient.refetchQueries({ queryKey: getQueueControllerGetQueueQueryKey(roomId) });
    } catch {
      /* reorder failed */
    }
    setReorderingId(null);
    setLocalOrder(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setLocalOrder(null);
    setOverId(null);
  };

  return {
    items,
    activeItem,
    sensors,
    reorderingId,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
