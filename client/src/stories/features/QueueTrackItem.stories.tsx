import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { GripVertical, Trash2 } from 'lucide-react';

import type { RoomQueue } from '@/api/model';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import QueueTrackItem from '@/components/queue/QueueTrackItem';

const mockItem: RoomQueue = {
  id: 'q1',
  room: {} as RoomQueue['room'],
  track: {
    id: 't1',
    sourceId: 'dQw4w9WgXcQ',
    provider: 'yt',
    name: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    durationMs: 213000,
  } as RoomQueue['track'],
  addedBy: { id: 'u1', nickname: 'DJ_Kim' } as RoomQueue['addedBy'],
  position: 1,
  played: false,
  isAutoDj: false,
  addedAt: new Date().toISOString(),
  version: 1,
};

const meta: Meta<typeof QueueTrackItem> = {
  title: 'Features/QueueTrackItem',
  component: QueueTrackItem,
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof QueueTrackItem>;

export const Default: Story = { args: { item: mockItem } };

export const WithGrip: Story = {
  args: {
    item: mockItem,
    leading: <GripVertical size={14} className="text-sa-text-muted cursor-grab" />,
  },
};

export const WithActions: Story = {
  args: {
    item: mockItem,
    leading: <GripVertical size={14} className="text-sa-text-muted" />,
    actions: <Trash2 size={12} className="text-sa-text-muted hover:text-red-400 cursor-pointer" />,
    favoriteSlot: <FavoriteButton active={true} onClick={() => {}} size={11} className="absolute -left-1.5 -top-1.5" />,
  },
};

export const AutoDj: Story = {
  args: { item: { ...mockItem, isAutoDj: true, addedBy: undefined } },
};
