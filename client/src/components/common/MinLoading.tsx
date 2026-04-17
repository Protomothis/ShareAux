'use client';

import { useEffect, useRef, useState } from 'react';

interface MinLoadingProps {
  loading: boolean;
  minMs?: number;
  children: React.ReactNode;
  fallback: React.ReactNode;
}

/** 최소 표시 시간을 보장하는 로딩 래퍼. 깜빡임 방지. */
export function MinLoading({ loading, minMs = 500, children, fallback }: MinLoadingProps) {
  const [showFallback, setShowFallback] = useState(loading);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const startRef = useRef(0);

  useEffect(() => {
    if (loading) {
      startRef.current = Date.now();
      setShowFallback(true);
    } else {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, minMs - elapsed);
      timerRef.current = setTimeout(() => setShowFallback(false), remaining);
    }
    return () => clearTimeout(timerRef.current);
  }, [loading, minMs]);

  return showFallback ? fallback : children;
}
