'use client';

import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { memo, type ReactNode } from 'react';

import type { RoomQueue } from '@/api/model';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

import MarqueeText from '../common/MarqueeText';
import Thumbnail from '../common/Thumbnail';

function timeAgo(dateStr: string): string {
  const utc = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
  return formatDistanceToNow(new Date(utc), { addSuffix: true, locale: ko });
}

interface QueueTrackItemProps {
  item: RoomQueue;
  /** 왼쪽 슬롯 (grip 핸들, 로딩 등) */
  leading?: ReactNode;
  /** 아티스트 줄 오른쪽 인라인 액션 (투표, 삭제 등) */
  actions?: ReactNode;
  /** 썸네일 좌상단 슬롯 (즐겨찾기 등) */
  favoriteSlot?: ReactNode;
  className?: string;
}

export default memo(function QueueTrackItem({ item, leading, actions, favoriteSlot, className }: QueueTrackItemProps) {
  return (
    <div className={cn('group/item flex items-center gap-3 rounded-xl px-3 py-2.5 transition select-none', className)}>
      {leading}

      {/* 썸네일 + 재생시간 오버레이 */}
      <div className="relative shrink-0">
        <div className="h-12 w-12 overflow-hidden rounded-lg">
          <Thumbnail src={item.track.thumbnail} size="sm" className="h-full w-full rounded-lg" />
          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] tabular-nums leading-tight text-white/80">
            {formatDuration(item.track.durationMs)}
          </span>
        </div>
        {favoriteSlot && <div className="absolute -left-1.5 -top-1.5 z-10">{favoriteSlot}</div>}
      </div>

      {/* 곡 정보 */}
      <div className="min-w-0 flex-1">
        <MarqueeText
          text={item.track.songTitle ?? item.track.name}
          className="text-sm font-medium leading-snug text-white"
        />
        <div className="mt-0.5 flex items-center gap-1">
          <p className="min-w-0 flex-1 truncate text-xs text-sa-text-secondary">
            {item.track.songArtist ?? item.track.artist}
          </p>
          {actions && <div className="flex shrink-0 items-center">{actions}</div>}
        </div>
        {item.addedBy ? (
          <p className="mt-1 text-[10px] leading-none text-sa-text-muted">
            {item.addedBy.nickname} · {timeAgo(item.addedAt)}
          </p>
        ) : item.isAutoDj ? (
          <p className="mt-1 text-[10px] leading-none text-sa-text-muted">🤖 AutoDJ</p>
        ) : null}
      </div>
    </div>
  );
});

export { timeAgo };
