'use client';

import { Settings, Share2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface RoomNavProps {
  roomName: string;
  memberCount: number;
  listenerCount: number;
  isHost: boolean;
  onShare: () => void;
  onSettings: () => void;
  onLeave: () => void;
}

export default function RoomNav({
  roomName,
  memberCount,
  listenerCount,
  isHost,
  onShare,
  onSettings,
  onLeave,
}: RoomNavProps) {
  return (
    <nav className="flex shrink-0 select-none items-center gap-2 border-b border-white/10 bg-black/60 px-4 py-3 backdrop-blur-2xl">
      <Tooltip>
        <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={onShare} />}>
          <Share2 size={18} />
        </TooltipTrigger>
        <TooltipContent>공유</TooltipContent>
      </Tooltip>

      {isHost && (
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={onSettings} />}>
            <Settings size={18} />
          </TooltipTrigger>
          <TooltipContent>설정</TooltipContent>
        </Tooltip>
      )}

      <h1 className="flex-1 truncate text-center font-semibold text-white">{roomName}</h1>

      <div className="flex items-center gap-3 text-sm text-sa-text-secondary">
        <span className="flex items-center gap-1">
          <Users size={14} /> {memberCount}
        </span>
        <Separator orientation="vertical" className="h-4 bg-white/20" />
        <span className="flex items-center gap-1 text-sa-accent">🎧 {listenerCount}</span>
      </div>

      <Button variant="outline" size="sm" onClick={onLeave} className="ml-2 text-red-400 hover:text-red-300">
        나가기
      </Button>
    </nav>
  );
}
