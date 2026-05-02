import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import TrackVoteButtons from '@/components/queue/TrackVoteButtons';

const TRACK_ID = 'mock-track-id';
const ROOM_ID = 'mock-room-id';

/** API mock 데이터를 QueryClient에 주입 */
function createMockClient(myVote: string | null, likes: number, dislikes: number) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnMount: false } } });
  qc.setQueryData([`/api/tracks/${TRACK_ID}/vote`], { vote: myVote });
  qc.setQueryData([`/api/tracks/${TRACK_ID}/stats`], { likes, dislikes });
  return qc;
}

const meta = {
  component: TrackVoteButtons,
  tags: ['autodocs'],
  args: { trackId: TRACK_ID, roomId: ROOM_ID },
} satisfies Meta<typeof TrackVoteButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={createMockClient(null, 12, 3)}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};

export const Liked: Story = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={createMockClient('like', 42, 5)}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};

export const Disliked: Story = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={createMockClient('dislike', 8, 15)}>
        <Story />
      </QueryClientProvider>
    ),
  ],
};
