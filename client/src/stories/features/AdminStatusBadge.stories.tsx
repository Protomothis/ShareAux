import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StatusBadge } from '@/components/admin/StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Features/Admin/StatusBadge',
  component: StatusBadge,
};
export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-2">
      <StatusBadge variant="success">온라인</StatusBadge>
      <StatusBadge variant="danger">차단됨</StatusBadge>
      <StatusBadge variant="muted">오프라인</StatusBadge>
      <StatusBadge variant="accent">호스트</StatusBadge>
    </div>
  ),
};
