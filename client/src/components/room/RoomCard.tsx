'use client';

import { Lock, Music, Users } from 'lucide-react';
import { memo } from 'react';
import { useTranslations } from 'next-intl';

import type { RoomListItem } from '@/api/model';
import MarqueeText from '@/components/common/MarqueeText';
import Thumbnail from '@/components/common/Thumbnail';
import { Badge } from '@/components/ui/badge';
import { getAvatar } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import { surfaceVariants } from '@/components/ui/surface';

interface RoomCardProps {
  room: RoomListItem;
  onClick: () => void;
}

export default memo(function RoomCard({ room, onClick }: RoomCardProps) {
  const t = useTranslations('rooms');
  const track = room.playback?.track;
  const thumbnail = track?.thumbnail && track.thumbnail !== 'NA' ? track.thumbnail : null;
  const isPlaying = !!track;
  const previews = room.memberPreview ?? [];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        surfaceVariants({ variant: 'interactive', padding: 'none' }),
        'group relative overflow-hidden',
        isPlaying && 'shadow-[0_0_20px_rgba(255,64,129,0.15)]',
      )}
    >
      {/* 썸네일 배경 블러 */}
      {thumbnail && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.12] blur-2xl transition-opacity group-hover:opacity-[0.18]"
          style={{ backgroundImage: `url(${thumbnail})` }}
        />
      )}

      <div className="relative flex gap-4 p-5">
        {/* 썸네일 */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
          {thumbnail ? (
            <Thumbnail src={thumbnail} size="sm" className="h-full w-full rounded-xl" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-white/[0.03] text-white/10">
              <Music size={28} />
            </div>
          )}
          {isPlaying && (
            <div className="absolute inset-0 flex items-end justify-center gap-[2px] rounded-xl bg-black/40 pb-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-[3px] animate-[eq_ease-in-out_infinite_alternate] rounded-full bg-sa-accent"
                  style={{ animationDuration: `${0.6 + i * 0.15}s`, height: `${8 + i * 3}px` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-white">{room.name}</h3>
            {room.isPrivate && (
              <Badge
                variant="outline"
                className="shrink-0 gap-0.5 border-white/10 px-1.5 py-0 text-[10px] text-sa-text-muted"
              >
                <Lock size={9} />
              </Badge>
            )}
          </div>

          {isPlaying ? (
            <MarqueeText text={`${track.name} — ${track.artist}`} className="mt-1 text-xs text-sa-accent" />
          ) : (
            <p className="mt-1 text-xs text-sa-text-muted">{t('card.idle')}</p>
          )}

          <div className="mt-2.5 flex items-center justify-between">
            {/* 멤버 아바타 스택 */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {previews.map((nick, i) => (
                  <img key={i} src={getAvatar(nick)} alt="" className="size-5 rounded-full ring-1 ring-black/50" />
                ))}
              </div>
              <span className="flex items-center gap-1 text-xs text-sa-text-muted">
                <Users size={11} />
                {room.memberCount ?? 0}/{room.maxMembers}
              </span>
            </div>

            <span className="truncate text-[10px] text-sa-text-muted">{room.host?.nickname}</span>
          </div>
        </div>
      </div>
    </div>
  );
});
