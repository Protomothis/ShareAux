'use client';

import { Heart, Loader2 } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  active: boolean;
  onClick: () => void;
  loading?: boolean;
  size?: number;
  className?: string;
}

const MIN_LOADING_MS = 500;

/** 즐겨찾기 하트 버튼 — <button> 중첩 방지를 위해 div role="button" 사용 */
export const FavoriteButton = memo(function FavoriteButton({
  active,
  onClick,
  loading,
  size = 14,
  className,
}: FavoriteButtonProps) {
  const [showLoading, setShowLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (loading) {
      setShowLoading(true);
      if (timerRef.current) clearTimeout(timerRef.current);
    } else if (showLoading) {
      timerRef.current = setTimeout(() => setShowLoading(false), MIN_LOADING_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loading]);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        if (!showLoading) onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !showLoading) {
          e.stopPropagation();
          onClick();
        }
      }}
      className={cn('rounded-full bg-black/60 p-1 cursor-pointer touch-manipulation', className)}
    >
      {showLoading ? (
        <Loader2 size={size} className="animate-spin text-white/50" />
      ) : (
        <Heart size={size} className={cn(active ? 'fill-red-400 text-red-400' : 'text-white/50 hover:text-white')} />
      )}
    </div>
  );
});
