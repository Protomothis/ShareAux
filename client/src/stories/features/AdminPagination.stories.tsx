import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import { AdminPagination } from '@/components/admin/AdminPagination';

const meta: Meta<typeof AdminPagination> = {
  title: 'Features/Admin/Pagination',
  component: AdminPagination,
};
export default meta;
type Story = StoryObj<typeof AdminPagination>;

export const Default: Story = {
  render: () => {
    const [page, setPage] = useState(3);
    return <AdminPagination page={page} totalPages={10} onPageChange={setPage} />;
  },
};

export const FirstPage: Story = {
  render: () => {
    const [page, setPage] = useState(1);
    return <AdminPagination page={page} totalPages={5} onPageChange={setPage} />;
  },
};
