import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import AudioControl from '@/components/player/AudioControl';

const mockTrack = {
  id: 'mock-track',
  sourceId: 'mock-source',
  provider: 'yt' as const,
  name: 'Blinding Lights — The Weeknd (Official Music Video)',
  artist: 'The Weeknd',
  thumbnail: 'https://picsum.photos/200',
  durationMs: 200000,
};

const meta: Meta<typeof AudioControl> = {
  title: 'Features/AudioControl',
  component: AudioControl,
  args: { onListenToggle: fn(), onVolumeChange: fn(), volume: 0.7 },
  decorators: [
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof AudioControl>;

export const Playing: Story = {
  args: { track: mockTrack, listening: true, isPlaying: true, elapsedBase: 60000, syncTime: Date.now() },
};

export const Paused: Story = {
  args: { track: mockTrack, listening: false, isPlaying: false },
};

export const Loading: Story = {
  args: { track: mockTrack, listening: false, audioLoading: true },
};

export const NoTrack: Story = {
  args: { track: null, listening: false },
};
