import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import Player from '@/components/player/Player';
import { LyricsStatus } from '@/types';

const mockTrack = {
  id: 'mock-track',
  name: 'Blinding Lights — The Weeknd (Official Music Video)',
  artist: 'The Weeknd',
  thumbnail: 'https://picsum.photos/200',
  durationMs: 200000,
};

const baseArgs = {
  roomId: 'r1',
  onVolumeChange: fn(),
  onListenToggle: fn(),
  volume: 0.7,
  skipVotes: 0,
  skipRequired: 3,
  hasNext: true,
  hasPrev: true,
};

const meta: Meta<typeof Player> = {
  title: 'Features/Player',
  component: Player,
  args: baseArgs,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Player>;

export const HostPlaying: Story = {
  args: {
    isHost: true,
    track: mockTrack,
    listening: true,
    isPlaying: true,
    elapsedBase: 60000,
    syncTime: Date.now(),
    streamCodec: 'opus',
    streamBitrate: 128,
    lyricsStatus: LyricsStatus.Found,
  },
};

export const ListenerPlaying: Story = {
  args: {
    isHost: false,
    track: mockTrack,
    listening: true,
    isPlaying: true,
    elapsedBase: 30000,
    syncTime: Date.now(),
    skipVotes: 1,
  },
};

export const Loading: Story = {
  args: { isHost: false, track: mockTrack, listening: false, audioLoading: true },
};

export const Empty: Story = {
  args: { isHost: true, track: null, listening: false },
};
