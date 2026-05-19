import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/common/Button';

const meta: Meta<typeof AdminPageHeader> = {
  title: 'Features/Admin/PageHeader',
  component: AdminPageHeader,
};
export default meta;
type Story = StoryObj<typeof AdminPageHeader>;

export const Simple: Story = { args: { title: '사용자 관리' } };

export const WithSearch: Story = {
  render: () => {
    const [q, setQ] = useState('');
    return <AdminPageHeader title="사용자 관리" search={{ value: q, onChange: setQ, placeholder: '검색...' }} />;
  },
};

export const WithActions: Story = {
  render: () => (
    <AdminPageHeader title="초대 코드">
      <Button variant="accent" size="sm">
        새 코드 생성
      </Button>
    </AdminPageHeader>
  ),
};
