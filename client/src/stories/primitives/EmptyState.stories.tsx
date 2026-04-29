import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Inbox, Music, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

const meta: Meta<typeof EmptyState> = {
  title: 'Primitives/EmptyState',
  component: EmptyState,
};
export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    icon: <Inbox size={32} className="text-white/10" />,
    title: '아직 아무것도 없어요',
    description: '첫 번째 항목을 추가해보세요',
  },
};

export const WithAction: Story = {
  args: {
    icon: <Music size={32} className="text-white/10" />,
    title: '재생목록이 비어있습니다',
    description: '곡을 검색해서 추가해보세요',
    action: <Button size="sm"><Search size={14} /> 검색</Button>,
  },
};

export const TitleOnly: Story = {
  args: { title: '로딩 중...' },
};
