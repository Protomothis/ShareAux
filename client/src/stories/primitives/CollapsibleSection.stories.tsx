import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Music, Users } from 'lucide-react';

import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof CollapsibleSection> = {
  title: 'Primitives/CollapsibleSection',
  component: CollapsibleSection,
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof CollapsibleSection>;

export const Open: Story = {
  args: {
    title: '재생목록',
    icon: <Music size={14} />,
    count: 5,
    defaultOpen: true,
    children: (
      <div className="space-y-1 px-1">
        {['곡 A', '곡 B', '곡 C'].map((s) => (
          <div key={s} className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white">{s}</div>
        ))}
      </div>
    ),
  },
};

export const Closed: Story = {
  args: { ...Open.args, defaultOpen: false },
};

export const WithAction: Story = {
  args: {
    title: '멤버',
    icon: <Users size={14} />,
    count: 3,
    action: <Button variant="ghost" size="xs">초대</Button>,
    children: <div className="px-1 py-2 text-xs text-sa-text-muted">멤버 목록...</div>,
  },
};
