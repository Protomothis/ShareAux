import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import PlayerProgress from '@/components/player/PlayerProgress';

const meta: Meta<typeof PlayerProgress> = {
  title: 'Features/Player/PlayerProgress',
  component: PlayerProgress,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof PlayerProgress>;

export const HalfWay: Story = {
  args: { elapsed: 120000, duration: 240000, progress: 0.5 },
};

export const Start: Story = {
  args: { elapsed: 0, duration: 200000, progress: 0 },
};

export const NearEnd: Story = {
  args: { elapsed: 190000, duration: 200000, progress: 0.95 },
};

export const NoTime: Story = {
  args: { elapsed: 60000, duration: 180000, progress: 0.33, showTime: false },
};
