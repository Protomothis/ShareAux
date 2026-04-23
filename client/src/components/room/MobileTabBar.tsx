'use client';

import { History, List, MessageSquare, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import TabBar from '@/components/common/TabBar';
import type { MobileTab } from '@/types';

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

export default function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  const t = useTranslations('room');
  const tabs = [
    { key: 'chat' as const, icon: <MessageSquare size={18} />, label: t('tabChat') },
    { key: 'queue' as const, icon: <List size={18} />, label: t('tabQueue') },
    { key: 'history' as const, icon: <History size={18} />, label: t('tabHistory') },
    { key: 'members' as const, icon: <Users size={18} />, label: t('tabMembers') },
  ];
  return <TabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} variant="bottom" />;
}
