import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import type { RoomListItem } from '@/api/model';
import RoomCard from '@/components/room/RoomCard';

const base: RoomListItem = {
  id: 'r1',
  host: { id: 'u1', nickname: 'DJ_Kim' } as RoomListItem['host'],
  name: '금요일 밤 파티 🎉',
  maxMembers: 20,
  isPrivate: false,
  inviteCode: 'abc123',
  isActive: true,
  enqueueWindowMin: 10,
  enqueueLimitPerWindow: 5,
  crossfade: false,
  maxSelectPerAdd: 10,
  replayCooldownMin: 0,
  defaultEnqueueEnabled: true,
  defaultVoteSkipEnabled: true,
  autoDjEnabled: true,
  autoDjMode: 'mixed' as RoomListItem['autoDjMode'],
  autoDjThreshold: 2,
  autoDjFavFallbackMixed: true,
  createdAt: new Date().toISOString(),
  memberCount: 5,
  memberPreview: ['u1', 'u2', 'u3'],
  playback: {
    track: {
      id: 't1',
      name: 'Blinding Lights',
      artist: 'The Weeknd',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    },
    isPlaying: true,
  } as RoomListItem['playback'],
};

const meta: Meta<typeof RoomCard> = {
  title: 'Features/RoomCard',
  component: RoomCard,
  args: { onClick: fn() },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof RoomCard>;

export const Playing: Story = { args: { room: base } };

export const Empty: Story = {
  args: { room: { ...base, playback: null as unknown as RoomListItem['playback'], memberCount: 1, memberPreview: ['u1'] } },
};

export const Private: Story = {
  args: { room: { ...base, isPrivate: true, name: '비밀 방 🔒' } },
};

export const Full: Story = {
  args: { room: { ...base, memberCount: 20, memberPreview: ['u1', 'u2', 'u3', 'u4', 'u5'] } },
};
