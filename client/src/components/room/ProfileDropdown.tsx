'use client';

import { ChevronDown, LogOut, Settings, Shield } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import ProfileSettingsModal from '@/components/room/ProfileSettingsModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAvatar } from '@/lib/avatar';

interface ProfileDropdownProps {
  nickname: string;
  email: string;
  isAdmin?: boolean;
  onLogout: () => void;
}

export default function ProfileDropdown({ nickname, email, isAdmin, onLogout }: ProfileDropdownProps) {
  const t = useTranslations('rooms');
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-9 items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 text-sm text-white transition hover:bg-white/10 outline-none">
          <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full">
            <img src={getAvatar(nickname)} alt="" className="h-full w-full" />
          </div>
          <span className="hidden sm:inline">{nickname}</span>
          <ChevronDown size={14} className="text-sa-text-muted" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div>
                <p className="text-sm font-medium text-white">{nickname}</p>
                <p className="text-xs text-muted-foreground">{email}</p>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Settings size={14} />
            {t('profile.settings')}
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem className="text-sa-accent" render={<Link href="/admin" />}>
              <Shield size={14} />
              {t('profile.admin')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onLogout}>
            <LogOut size={14} />
            {t('profile.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ProfileSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
