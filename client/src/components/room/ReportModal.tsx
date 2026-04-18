'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { reportControllerCreateReport } from '@/api/reports/reports';
import Modal from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetId: string;
  targetNickname: string;
}

const REASONS = ['부적절한 행동', '스팸/도배', '불쾌한 닉네임', '기타'];

export function ReportModal({ open, onClose, targetId, targetNickname }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await reportControllerCreateReport({ targetType: 'user', targetId, reason, details: details || undefined });
      toast.success('신고가 접수되었습니다');
      onClose();
    } catch {}
    setSubmitting(false);
  };

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()} className="sm:max-w-sm">
      <Modal.Header>
        <Modal.Title>🚨 신고하기</Modal.Title>
        <Modal.Description>{targetNickname}님을 신고합니다</Modal.Description>
      </Modal.Header>
      <Modal.Body className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <Button key={r} variant={reason === r ? 'accent' : 'outline'} size="sm" onClick={() => setReason(r)}>
              {r}
            </Button>
          ))}
        </div>
        <Input
          placeholder="상세 내용 (선택)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={200}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button variant="destructive" onClick={handleSubmit} disabled={!reason || submitting}>
          {submitting ? '접수 중...' : '신고'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
