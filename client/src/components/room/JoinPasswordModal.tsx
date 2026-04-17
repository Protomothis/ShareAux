'use client';

import { useState } from 'react';

import Modal from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface JoinPasswordModalProps {
  roomName: string;
  open: boolean;
  onSubmit: (password: string) => void;
  onClose: () => void;
}

export default function JoinPasswordModal({ open, onSubmit, onClose }: JoinPasswordModalProps) {
  const [password, setPassword] = useState('');

  return (
    <Modal open={open} onClose={onClose} showCloseButton={false}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(password);
        }}
      >
        <Modal.Header>
          <Modal.Title>비밀번호 입력</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormField label="비밀번호">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              autoFocus
            />
          </FormField>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" className="w-full">
            입장
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
