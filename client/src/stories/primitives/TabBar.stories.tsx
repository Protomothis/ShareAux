import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { List, MessageSquare, Music } from 'lucide-react';
import { fn } from 'storybook/test';

import TabBar from '@/components/common/TabBar';

const tabs = [
  { key: 'queue', icon: <List size={16} />, label: '재생목록' },
  { key: 'chat', icon: <MessageSquare size={16} />, label: '채팅' },
  { key: 'player', icon: <Music size={16} />, label: '플레이어' },
];

const meta: Meta<typeof TabBar> = {
  title: 'Primitives/TabBar',
  component: TabBar,
  args: { tabs, activeTab: 'queue', onTabChange: fn() },
};
export default meta;
type Story = StoryObj<typeof TabBar>;

export const Pill: Story = { args: { variant: 'pill' } };
export const Bottom: Story = { args: { variant: 'bottom' } };
export const ChatActive: Story = { args: { activeTab: 'chat', variant: 'pill' } };
