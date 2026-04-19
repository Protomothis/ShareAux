'use client';

import { Heart, Loader2 } from 'lucide-react';
import { memo } from 'react';

import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  active: boolean;
  onClick: () => void;
  loading?: boolean;
  size?: number;
  className?: string;
}

/** 즐겨찾기 하트 버튼 — <button> 중첩 방지를 위해 div role="button" 사용 */
export const FavoriteButton = memo(function FavoriteButton({
  active,
  onClick,
  loading,
  size = 14,
  className,
}: FavoriteButtonProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        if (!loading) onClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !loading) {
          e.stopPropagation();
          onClick();
        }
      }}
      className={cn('rounded-full bg-black/60 p-1 cursor-pointer touch-manipulation', className)}
    >
      {loading ? (
        <Loader2 size={size} className="animate-spin text-white/50" />
      ) : (
        <Heart size={size} className={cn(active ? 'fill-red-400 text-red-400' : 'text-white/50 hover:text-white')} />
      )}
    </div>
  );
});
