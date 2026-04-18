'use client';

import { Flag, Settings2, UserRound } from 'lucide-react';

import type { MemberWithPermission } from '@/api/model';
import Modal from '@/components/common/Modal';
import { Button } from '@/components/ui/button';

interface MemberActionMenuProps {
  open: boolean;
  onClose: () => void;
  member: MemberWithPermission;
  isHost: boolean;
  onPermissions: () => void;
  onReport: () => void;
}

export function MemberActionMenu({ open, onClose, member, isHost, onPermissions, onReport }: MemberActionMenuProps) {
  const nickname = member.user?.nickname ?? '알 수 없음';

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()} className="sm:max-w-xs">
      <Modal.Header>
        <Modal.Title className="flex items-center gap-2">
          <UserRound className="size-4" />
          {nickname}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-2 py-3">
        {isHost && (
          <Button variant="ghost" className="justify-start gap-2" onClick={() => onPermissions()}>
            <Settings2 className="size-4" />
            권한 관리
          </Button>
        )}
        <Button
          variant="ghost"
          className="justify-start gap-2 text-destructive hover:text-destructive"
          onClick={() => onReport()}
        >
          <Flag className="size-4" />
          신고하기
        </Button>
      </Modal.Body>
    </Modal>
  );
}
