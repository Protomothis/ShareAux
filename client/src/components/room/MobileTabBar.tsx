'use client';

import { History, List, MessageSquare, Users } from 'lucide-react';

import type { TabItem } from '@/components/common/TabBar';
import TabBar from '@/components/common/TabBar';
import type { MobileTab } from '@/types';

const TABS: TabItem<MobileTab>[] = [
  { key: 'chat', icon: <MessageSquare size={18} />, label: '채팅' },
  { key: 'queue', icon: <List size={18} />, label: '신청곡' },
  { key: 'history', icon: <History size={18} />, label: '기록' },
  { key: 'members', icon: <Users size={18} />, label: '멤버' },
];

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

export default function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  return <TabBar tabs={TABS} activeTab={activeTab} onTabChange={onTabChange} variant="bottom" />;
}
