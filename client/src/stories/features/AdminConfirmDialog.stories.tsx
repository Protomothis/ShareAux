import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'Features/Admin/ConfirmDialog',
  component: ConfirmDialog,
};
export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>열기</Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="사용자 차단"
          description="이 사용자를 정말 차단하시겠습니까?"
          onConfirm={fn()}
        />
      </>
    );
  },
};

export const Destructive: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Button onClick={() => setOpen(true)}>열기</Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="방 삭제"
          description="이 방을 삭제하면 복구할 수 없습니다."
          confirmLabel="삭제"
          variant="destructive"
          onConfirm={fn()}
        />
      </>
    );
  },
};
