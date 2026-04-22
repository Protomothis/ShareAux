'use client';

import { History, List, MessageSquare, Users } from 'lucide-react';

import type { TabItem } from '@/components/common/TabBar';
import TabBar from '@/components/common/TabBar';
import type { MobileTab } from '@/types';
import { useTranslations } from 'next-intl';

const TABS: TabItem<MobileTab>[] = [
  { key: 'chat', icon: <MessageSquare size={18} />, label: 'chat' },
  { key: 'queue', icon: <List size={18} />, label: 'queue' },
  { key: 'history', icon: <History size={18} />, label: 'history' },
  { key: 'members', icon: <Users size={18} />, label: 'members' },
];

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

export default function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  const t = useTranslations('room');
  return <TabBar tabs={TABS} activeTab={activeTab} onTabChange={onTabChange} variant="bottom" />;
}
