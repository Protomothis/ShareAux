'use client';

import { Loader2, Trash2, Users } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import type { User } from '@/api/model';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import Modal from '@/components/common/Modal';
import { Button } from '@/components/ui/button';
import { customFetch } from '@/api/mutator';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface InviteCodeUsersModalProps {
  inviteCodeId: string | null;
  code: string;
  onOpenChange: (open: boolean) => void;
}

export function InviteCodeUsersModal({ inviteCodeId, code, onOpenChange }: InviteCodeUsersModalProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin', 'invite-codes', inviteCodeId, 'users'],
    queryFn: () => customFetch(`/admin/invite-codes/${inviteCodeId}/users`),
    enabled: !!inviteCodeId,
  });

  const guestCount = users.filter((u) => u.role === 'guest').length;

  const handleDeleteGuests = useCallback(async () => {
    if (!inviteCodeId) return;
    setDeleting(true);
    try {
      await customFetch(`/admin/invite-codes/${inviteCodeId}/guests`, { method: 'DELETE' });
      toast.success(`게스트 ${guestCount}명 삭제 완료`);
      setConfirmOpen(false);
      await qc.invalidateQueries({ queryKey: ['admin', 'invite-codes', inviteCodeId, 'users'] });
    } catch {
      /* mutator handles toast */
    } finally {
      setDeleting(false);
    }
  }, [inviteCodeId, guestCount, qc]);

  return (
    <Modal open={!!inviteCodeId} onOpenChange={onOpenChange} className="sm:max-w-md">
      <Modal.Header>
        <Modal.Title className="flex items-center gap-2">
          <Users size={16} /> 초대코드 유저 — {code}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {isLoading ? (
          <div className="flex h-20 items-center justify-center">
            <Loader2 size={20} className="animate-spin text-sa-text-muted" />
          </div>
        ) : users.length === 0 ? (
          <p className="py-6 text-center text-sm text-sa-text-muted">이 코드로 가입한 유저가 없습니다</p>
        ) : (
          <div className="space-y-1.5">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                <div>
                  <span className="text-sm text-white">{u.nickname}</span>
                  {u.username && <span className="ml-2 text-xs text-sa-text-muted">@{u.username}</span>}
                </div>
                <StatusBadge variant={u.role === 'guest' ? 'muted' : 'success'}>{u.role}</StatusBadge>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>

      {guestCount > 0 && (
        <Modal.Footer>
          <Button variant="destructive" className="gap-1.5" onClick={() => setConfirmOpen(true)}>
            <Trash2 size={14} /> 게스트 {guestCount}명 일괄 삭제
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="게스트 일괄 삭제"
            description={`이 초대코드로 입장한 게스트 ${guestCount}명을 모두 삭제합니다. 일반 회원은 영향받지 않습니다.`}
            confirmLabel="삭제"
            variant="destructive"
            onConfirm={handleDeleteGuests}
            loading={deleting}
          />
        </Modal.Footer>
      )}
    </Modal>
  );
}
