'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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

export function ReportModal({ open, onClose, targetId, targetNickname }: ReportModalProps) {
  const t = useTranslations('report');
  const reasons = [t('inappropriate'), t('spam'), t('offensiveName'), t('other')];
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await reportControllerCreateReport({ targetType: 'user', targetId, reason, details: details || undefined });
      toast.success(t('done'));
      onClose();
    } catch {}
    setSubmitting(false);
  };

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()} className="sm:max-w-sm">
      <Modal.Header>
        <Modal.Title>{t('title')}</Modal.Title>
        <Modal.Description>{t('description', { nickname: targetNickname })}</Modal.Description>
      </Modal.Header>
      <Modal.Body className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {reasons.map((r) => (
            <Button key={r} variant={reason === r ? 'accent' : 'outline'} size="sm" onClick={() => setReason(r)}>
              {r}
            </Button>
          ))}
        </div>
        <Input
          placeholder={t('detailPlaceholder')}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={200}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button variant="destructive" onClick={handleSubmit} disabled={!reason || submitting}>
          {submitting ? t('submitting') : t('submit')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
