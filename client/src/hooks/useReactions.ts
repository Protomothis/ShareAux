'use client';
import { useCallback, useRef, useState } from 'react';

import type { FloatingReaction } from '@/types';

const REACTIONS = ['❤️', '🔥', '🎉', '👏', '😍', '🤩'];

export function useReactions() {
  const idRef = useRef(0);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  const onReaction = useCallback((index: number) => {
    const rid = ++idRef.current;
    const x = 20 + Math.random() * 60;
    const y = 30 + Math.random() * 40;
    setFloatingReactions((prev) => [...prev, { id: rid, x, y, emoji: REACTIONS[index] ?? '❤️' }]);
    setTimeout(() => setFloatingReactions((prev) => prev.filter((r) => r.id !== rid)), 2000);
  }, []);

  return { floatingReactions, onReaction };
}
