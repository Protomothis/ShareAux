import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import VoteSkip from '@/components/player/VoteSkip';

const meta: Meta<typeof VoteSkip> = {
  title: 'Features/VoteSkip',
  component: VoteSkip,
  args: { roomId: 'r1' },
};
export default meta;
type Story = StoryObj<typeof VoteSkip>;

export const NoVotes: Story = { args: { currentVotes: 0, required: 3 } };
export const SomeVotes: Story = { args: { currentVotes: 2, required: 3 } };
export const AlmostDone: Story = { args: { currentVotes: 4, required: 3 } };
