'use client';

import { Bell, Settings, Share2, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { NotificationSettings } from '@/components/common/NotificationSettings';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface RoomNavProps {
  roomId: string;
  roomName: string;
  memberCount: number;
  listenerCount: number;
  isHost: boolean;
  onShare: () => void;
  onSettings: () => void;
  onLeave: () => void;
}

export default function RoomNav({
  roomId,
  roomName,
  memberCount,
  listenerCount,
  isHost,
  onShare,
  onSettings,
  onLeave,
}: RoomNavProps) {
  const t = useTranslations('room');
  return (
    <nav className="flex shrink-0 select-none items-center gap-2 border-b border-white/10 bg-black/60 px-4 py-3 backdrop-blur-2xl">
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={onShare} />}>
          <Share2 size={18} />
        </TooltipTrigger>
        <TooltipContent>{t('share')}</TooltipContent>
      </Tooltip>

      {isHost && (
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={onSettings} />}>
            <Settings size={18} />
          </TooltipTrigger>
          <TooltipContent>{t('settings')}</TooltipContent>
        </Tooltip>
      )}

      <Popover>
        <Tooltip>
          <TooltipTrigger render={<PopoverTrigger render={<Button variant="ghost" size="icon" />} />}>
            <Bell size={18} />
          </TooltipTrigger>
          <TooltipContent>{t('notifications')}</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-72 border-white/10 bg-sa-bg-secondary p-4">
          <NotificationSettings roomId={roomId} />
        </PopoverContent>
      </Popover>

      <h1 className="flex-1 truncate text-center font-semibold text-white">{roomName}</h1>

      <div className="flex items-center gap-3 text-sm text-sa-text-secondary">
        <span className="flex items-center gap-1">
          <Users size={14} /> {memberCount}
        </span>
        <Separator orientation="vertical" className="h-4 bg-white/20" />
        <span className="flex items-center gap-1 text-sa-accent">🎧 {listenerCount}</span>
      </div>

      <Button variant="outline" size="sm" onClick={onLeave} className="ml-2 text-red-400 hover:text-red-300">
        {t('leave')}
      </Button>
    </nav>
  );
}
