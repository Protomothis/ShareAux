import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import TrackVoteButtons from '@/components/queue/TrackVoteButtons';

const meta: Meta<typeof TrackVoteButtons> = {
  title: 'Features/TrackVoteButtons',
  component: TrackVoteButtons,
  args: { trackId: 't1', roomId: 'r1' },
  decorators: [(Story) => <div className="max-w-xs"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof TrackVoteButtons>;

export const NoVotes: Story = {
  args: { votes: { likes: 0, dislikes: 0 } },
};

export const Popular: Story = {
  args: { votes: { likes: 42, dislikes: 3 } },
};

export const Controversial: Story = {
  args: { votes: { likes: 15, dislikes: 12 } },
};
