import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { AdminTable } from '@/components/admin/AdminTable';
import type { Column } from '@/components/admin/AdminTable';
import { StatusBadge } from '@/components/admin/StatusBadge';

const meta: Meta = {
  title: 'Features/Admin/Table',
};
export default meta;

interface MockUser {
  id: string;
  nickname: string;
  email: string;
  status: 'online' | 'offline' | 'banned';
  joinedAt: string;
}

const mockUsers: MockUser[] = [
  { id: '1', nickname: 'DJ_Kim', email: 'kim@test.com', status: 'online', joinedAt: '2024-01-15' },
  { id: '2', nickname: 'MusicLover', email: 'lover@test.com', status: 'offline', joinedAt: '2024-02-20' },
  { id: '3', nickname: 'BadUser', email: 'bad@test.com', status: 'banned', joinedAt: '2024-03-10' },
  { id: '4', nickname: 'NewUser', email: 'new@test.com', status: 'online', joinedAt: '2024-04-01' },
];

const columns: Column<MockUser>[] = [
  {
    key: 'nickname',
    header: '닉네임',
    primary: true,
    render: (u) => <span className="font-medium text-white">{u.nickname}</span>,
  },
  { key: 'email', header: '이메일', render: (u) => <span className="text-sa-text-muted">{u.email}</span> },
  {
    key: 'status',
    header: '상태',
    render: (u) => (
      <StatusBadge variant={u.status === 'online' ? 'success' : u.status === 'banned' ? 'danger' : 'muted'}>
        {u.status}
      </StatusBadge>
    ),
  },
  {
    key: 'joinedAt',
    header: '가입일',
    render: (u) => <span className="text-sa-text-muted">{u.joinedAt}</span>,
    hideOnMobile: true,
  },
];

export const Default: StoryObj = {
  render: () => <AdminTable columns={columns} data={mockUsers} rowKey={(u) => u.id} />,
};

export const Loading: StoryObj = {
  render: () => <AdminTable columns={columns} data={[]} loading rowKey={(u: MockUser) => u.id} />,
};

export const Empty: StoryObj = {
  render: () => (
    <AdminTable columns={columns} data={[]} rowKey={(u: MockUser) => u.id} emptyMessage="사용자가 없습니다" />
  ),
};

export const Clickable: StoryObj = {
  render: () => (
    <AdminTable columns={columns} data={mockUsers} rowKey={(u) => u.id} onRowClick={(u) => alert(u.nickname)} />
  ),
};
