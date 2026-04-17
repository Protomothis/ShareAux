'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import type { CreateInviteCodeDtoPermissionsItem } from '@/api/model';
import { CheckboxGroup } from '@/components/admin/CheckboxGroup';
import Modal from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import NumberStepper from '@/components/ui/number-stepper';
import { Switch } from '@/components/ui/switch';
import { useCreateInviteCode } from '@/hooks/admin/useAdminInviteCodes';
import { GUEST_PERM_OPTIONS } from '@/lib/constants';

interface CreateInviteCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInviteCodeModal({ open, onOpenChange }: CreateInviteCodeModalProps) {
  const [code, setCode] = useState('');
  const [maxUses, setMaxUses] = useState(10);
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [permissions, setPermissions] = useState<Set<string>>(new Set(['listen']));
  const [allowRegistration, setAllowRegistration] = useState(true);

  const createCode = useCreateInviteCode();

  const resetForm = () => {
    setCode('');
    setMaxUses(10);
    setExpiresAt(undefined);
    setPermissions(new Set(['listen']));
    setAllowRegistration(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createCode.mutate(
      {
        data: {
          ...(code && { code }),
          maxUses,
          permissions: [...permissions] as CreateInviteCodeDtoPermissionsItem[],
          ...(expiresAt && { expiresAt: expiresAt.toISOString() }),
          allowRegistration,
        },
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
          toast.success('초대코드가 생성되었습니다');
        },
      },
    );
  };

  const togglePerm = (key: string) => {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} className="sm:max-w-md">
      <form onSubmit={handleCreate}>
        <Modal.Header>
          <Modal.Title>새 초대코드</Modal.Title>
          <Modal.Description>초대코드를 생성하여 게스트를 초대하세요</Modal.Description>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <FormField label="코드 (비우면 자동 생성)">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PARTY2026" maxLength={12} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="최대 사용 횟수">
              <NumberStepper value={maxUses} onChange={setMaxUses} min={10} max={100} step={10} />
            </FormField>
            <FormField label="만료일 (선택)">
              <DatePicker value={expiresAt} onChange={setExpiresAt} placeholder="무기한" />
            </FormField>
          </div>
          <CheckboxGroup label="계정 권한" options={GUEST_PERM_OPTIONS} selected={permissions} onChange={togglePerm} />
          <p className="text-[11px] text-sa-text-muted">게스트 및 이 코드로 회원가입한 유저 모두에게 적용됩니다</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">회원가입 허용</p>
              <p className="text-xs text-sa-text-muted">이 코드로 정식 계정 생성 가능 (위 권한이 계정에 적용됨)</p>
            </div>
            <Switch checked={allowRegistration} onCheckedChange={setAllowRegistration} />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" variant="accent" disabled={createCode.isPending}>
            {createCode.isPending ? '생성 중...' : '생성'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
