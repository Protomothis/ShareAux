'use client';

import { Brain, History, List, MessageSquare, Pause, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import TabBar from '@/components/common/TabBar';
import type { MobileTab } from '@/types';

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  autoDjEnabled?: boolean;
  autoDjPaused?: boolean;
}

export default function MobileTabBar({ activeTab, onTabChange, autoDjEnabled, autoDjPaused }: MobileTabBarProps) {
  const t = useTranslations('room');
  const djIcon = autoDjPaused ? <Pause size={18} /> : <Brain size={18} />;
  const tabs = [
    { key: 'chat' as const, icon: <MessageSquare size={18} />, label: t('tabChat') },
    { key: 'queue' as const, icon: <List size={18} />, label: t('tabQueue') },
    { key: 'history' as const, icon: <History size={18} />, label: t('tabHistory') },
    ...(autoDjEnabled ? [{ key: 'autodj' as const, icon: djIcon, label: 'DJ' }] : []),
    { key: 'members' as const, icon: <Users size={18} />, label: t('tabMembers') },
  ];
  return <TabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} variant="bottom" />;
}
