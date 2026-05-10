import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Music, Radio, Users } from 'lucide-react';

import { StatCard } from '@/components/admin/StatCard';

const meta: Meta<typeof StatCard> = {
  title: 'Features/Admin/StatCard',
  component: StatCard,
};
export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = { args: { icon: Users, label: '활성 사용자', value: 128 } };
export const StringValue: Story = { args: { icon: Radio, label: '활성 방', value: '5개' } };
export const Loading: Story = { args: { icon: Music, label: '총 재생', value: null } };

export const Grid: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <StatCard icon={Users} label="활성 사용자" value={128} />
      <StatCard icon={Radio} label="활성 방" value={5} />
      <StatCard icon={Music} label="총 재생" value={1842} />
    </div>
  ),
};
