import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Plus, Search, Send, SkipForward } from 'lucide-react';
import { fn } from 'storybook/test';

import { Button } from '@/components/ui/button';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  args: { onClick: fn(), children: '버튼' },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {(['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const).map((v) => (
        <Button key={v} variant={v}>
          {v}
        </Button>
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {(['xs', 'sm', 'default', 'lg'] as const).map((s) => (
        <Button key={s} size={s}>
          size-{s}
        </Button>
      ))}
      {(['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const).map((s) => (
        <Button key={s} size={s} variant="outline">
          <Plus />
        </Button>
      ))}
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button>
        <Plus /> 방 만들기
      </Button>
      <Button variant="outline">
        <Search /> 검색
      </Button>
      <Button variant="ghost">
        <Send />
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, children: 'Disabled' },
};

// ShareAux에서 실제 사용되는 커스텀 버튼 패턴들
export const AppSpecific: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {/* 방 만들기 */}
      <button className="flex items-center gap-2 rounded-full bg-sa-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-sa-accent-hover hover:scale-105">
        <Plus size={16} /> 방 만들기
      </button>
      {/* 전송 */}
      <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-sa-accent text-white transition hover:bg-sa-accent-hover">
        <Send size={16} />
      </button>
      {/* 재생 */}
      <button className="flex h-9 w-9 items-center justify-center rounded-full bg-sa-accent text-white shadow-md shadow-sa-accent/25">
        <SkipForward size={16} />
      </button>
      {/* Ghost icon */}
      <button className="flex h-7 w-7 items-center justify-center rounded-full text-white/30 transition hover:text-white/70 hover:bg-white/[0.08]">
        <Search size={14} />
      </button>
    </div>
  ),
};
