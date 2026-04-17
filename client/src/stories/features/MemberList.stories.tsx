import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { MemberWithPermission } from '@/api/model';
import MemberList from '@/components/room/MemberList';

const mockMembers = [
  {
    roomId: 'r1',
    userId: 'u1',
    user: { id: 'u1', nickname: 'DJ_Kim' },
    role: 'host',
    joinedAt: new Date().toISOString(),
  },
  {
    roomId: 'r1',
    userId: 'u2',
    user: { id: 'u2', nickname: 'MusicLover' },
    role: 'member',
    joinedAt: new Date().toISOString(),
  },
  {
    roomId: 'r1',
    userId: 'u3',
    user: { id: 'u3', nickname: 'PartyPeople' },
    role: 'member',
    joinedAt: new Date().toISOString(),
    permission: { permissions: ['listen', 'chat', 'reaction', 'search'] },
  },
] as MemberWithPermission[];

const meta: Meta<typeof MemberList> = {
  title: 'Features/MemberList',
  component: MemberList,
  args: { roomId: 'r1', hostId: 'u1', members: mockMembers },
};
export default meta;
type Story = StoryObj<typeof MemberList>;

export const Default: Story = {
  args: { isHost: false },
};

export const AsHost: Story = {
  args: { isHost: true },
};

export const Empty: Story = {
  args: { members: [], isHost: false },
};
