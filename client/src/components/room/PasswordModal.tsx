'use client';

import { useState } from 'react';

import Modal from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface PasswordModalProps {
  open: boolean;
  onSubmit: (password: string) => void;
  onClose: () => void;
}

export default function PasswordModal({ open, onSubmit, onClose }: PasswordModalProps) {
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
          <Modal.Title>🔒 비밀번호 입력</Modal.Title>
          <Modal.Description>이 방은 비밀번호가 필요합니다</Modal.Description>
        </Modal.Header>
        <Modal.Body>
          <FormField label="비밀번호">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoFocus
            />
          </FormField>
        </Modal.Body>
        <Modal.Footer className="flex-col sm:flex-col">
          <Button type="submit" className="w-full">
            입장
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
            돌아가기
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
