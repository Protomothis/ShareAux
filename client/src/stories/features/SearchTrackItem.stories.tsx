import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import type { SearchResultItem } from '@/api/model';
import { SearchTrackItem } from '@/components/queue/SearchTrackItem';

const mockTrack: SearchResultItem = {
  provider: 'yt' as SearchResultItem['provider'],
  sourceId: 'dQw4w9WgXcQ',
  name: 'Never Gonna Give You Up',
  artist: 'Rick Astley',
  thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
  durationMs: 213000,
};

const meta: Meta<typeof SearchTrackItem> = {
  title: 'Features/SearchTrackItem',
  component: SearchTrackItem,
  args: { track: mockTrack, onClick: fn(), order: 0, disabled: false, full: false, inQueue: false },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof SearchTrackItem>;

export const Default: Story = {};
export const Selected: Story = { args: { order: 1 } };
export const SelectedMultiple: Story = { args: { order: 3 } };
export const InQueue: Story = { args: { inQueue: true, disabled: true } };
export const MaxReached: Story = { args: { full: true, disabled: true } };

export const WithFavorite: Story = {
  args: { isFavorite: true, onToggleFavorite: fn() },
};

export const Unavailable: Story = {
  args: { unavailable: true, unavailableLabel: '사용 불가' },
};
