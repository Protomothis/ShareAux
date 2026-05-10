import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import PlayerInfo from '@/components/player/PlayerInfo';
import { LyricsStatus } from '@/types';

const mockTrack = {
  id: 'mock-track',
  sourceId: 'mock-source',
  provider: 'yt' as const,
  name: 'Elektronomia — Sky High [NCS Release]',
  artist: 'Elektronomia',
  thumbnail: 'https://i.ytimg.com/vi/TW9d8vYrVFQ/hqdefault.jpg',
  durationMs: 200000,
};

const meta: Meta<typeof PlayerInfo> = {
  title: 'Features/Player/PlayerInfo',
  component: PlayerInfo,
  args: { roomId: 'r1', isHost: false },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof PlayerInfo>;

export const Playing: Story = {
  args: {
    track: mockTrack,
    isPlaying: true,
    streamCodec: 'opus',
    streamBitrate: 128,
    lyricsStatus: LyricsStatus.Found,
  },
};

export const WithFavorite: Story = {
  args: {
    track: mockTrack,
    isPlaying: true,
    isFavorite: true,
    onToggleFavorite: fn(),
  },
};

export const NoTrack: Story = {
  args: { track: null },
};

export const AutoDj: Story = {
  args: {
    track: mockTrack,
    isPlaying: true,
    autoDjEnabled: true,
    autoDjStatus: 'adding',
  },
};
