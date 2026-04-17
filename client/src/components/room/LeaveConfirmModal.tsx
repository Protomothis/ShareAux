'use client';

import Modal from '@/components/common/Modal';
import { Button } from '@/components/ui/button';

interface LeaveConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function LeaveConfirmModal({ open, onConfirm, onClose }: LeaveConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Header>
        <Modal.Title>정말 나가시겠습니까?</Modal.Title>
      </Modal.Header>
      <Modal.Footer>
        <Button variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            onClose();
            onConfirm();
          }}
        >
          나가기
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
