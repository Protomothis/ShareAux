import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import Modal from '@/components/common/Modal';

const meta: Meta<typeof Modal> = {
  title: 'Primitives/Modal',
  component: Modal,
  parameters: { layout: 'centered' },
};
export default meta;
type Story = StoryObj<typeof Modal>;

function ModalDemo({ className, children }: { className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-lg bg-sa-accent px-4 py-2 text-sm text-white">
        모달 열기
      </button>
      <Modal open={open} onClose={() => setOpen(false)} className={className}>
        {children}
      </Modal>
    </>
  );
}

export const Default: Story = {
  render: () => (
    <ModalDemo className="max-w-sm rounded-2xl backdrop-blur-2xl bg-black/80 border border-white/10 p-5">
      <h2 className="mb-2 text-lg font-semibold text-white">기본 모달</h2>
      <p className="text-sm text-sa-text-secondary">모달 내용이 여기에 표시됩니다.</p>
    </ModalDemo>
  ),
};

export const ConfirmDialog: Story = {
  render: () => (
    <ModalDemo className="max-w-xs rounded-2xl backdrop-blur-2xl bg-black/80 border border-white/10 p-5 text-center">
      <p className="mb-4 text-sm text-white">대기열에서 삭제할까요?</p>
      <div className="flex gap-2">
        <button className="flex-1 rounded-lg bg-white/10 py-2 text-sm text-white transition hover:bg-white/20">
          취소
        </button>
        <button className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-medium text-white transition hover:bg-red-600">
          삭제
        </button>
      </div>
    </ModalDemo>
  ),
};

export const SearchStyle: Story = {
  render: () => (
    <ModalDemo className="max-w-lg rounded-2xl backdrop-blur-2xl bg-black/80 border border-white/10 p-5 shadow-2xl">
      <h2 className="mb-4 text-lg font-semibold text-white">곡 검색</h2>
      <input
        placeholder="곡 제목 또는 아티스트..."
        className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-sa-text-muted outline-none focus:border-sa-accent/50 transition"
      />
      <p className="mt-4 py-8 text-center text-sm text-sa-text-muted">검색어를 입력하세요</p>
    </ModalDemo>
  ),
};
