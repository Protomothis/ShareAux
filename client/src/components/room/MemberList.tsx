'use client';

import { useMemo, useState } from 'react';

import type { MemberWithPermission } from '@/api/model';
import type { DisplayRole } from '@/lib/roles';
import { getDisplayRole } from '@/lib/roles';

import { MemberActionMenu } from './MemberActionMenu';
import MemberItem from './MemberItem';
import MemberPermissionModal from './MemberPermissionModal';
import { ReportModal } from './ReportModal';

interface MemberListProps {
  members: MemberWithPermission[];
  hostId: string;
  roomId: string;
  isHost?: boolean;
  userId?: string;
}

type ModalState = { type: 'menu' } | { type: 'permissions' } | { type: 'report' } | null;

export default function MemberList({ members, hostId, roomId, isHost, userId }: MemberListProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const ROLE_ORDER: Record<DisplayRole, number> = { superAdmin: 0, admin: 1, host: 2, member: 3, guest: 4 };
  const sorted = useMemo(
    () =>
      [...members].sort((a, b) => {
        const ra = ROLE_ORDER[getDisplayRole(a.user?.role, a.userId === hostId)];
        const rb = ROLE_ORDER[getDisplayRole(b.user?.role, b.userId === hostId)];
        return ra - rb;
      }),
    [members, hostId],
  );

  const selectedMember = useMemo(
    () => members.find((m) => m.userId === selectedUserId) ?? null,
    [members, selectedUserId],
  );

  const handleSelect = (uid: string) => {
    setSelectedUserId(uid);
    setModal(uid === userId ? { type: 'permissions' } : { type: 'menu' });
  };

  const handleClose = () => {
    setModal(null);
    setSelectedUserId(null);
  };

  return (
    <div className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-sa-text-secondary">👥 멤버 ({members.length})</h3>
      <div className="space-y-1" role="list">
        {members.length === 0 ? (
          <div className="py-4 text-center">
            <p className="mb-1 text-2xl">👥</p>
            <p className="text-xs text-sa-text-muted">아직 참여자가 없습니다</p>
          </div>
        ) : (
          sorted.map((m) => (
            <MemberItem
              key={m.userId}
              member={m}
              isHostUser={m.userId === hostId}
              hasEnqueuePermission={m.permission?.permissions?.includes('addQueue') !== false}
              onSelect={() => handleSelect(m.userId)}
            />
          ))
        )}
      </div>

      {selectedMember && modal?.type === 'menu' && (
        <MemberActionMenu
          open
          onClose={handleClose}
          member={selectedMember}
          isHost={!!isHost}
          onPermissions={() => setModal({ type: 'permissions' })}
          onReport={() => setModal({ type: 'report' })}
        />
      )}

      {selectedMember && modal?.type === 'permissions' && (
        <MemberPermissionModal
          open
          onClose={handleClose}
          member={selectedMember}
          roomId={roomId}
          isHost={!!isHost}
          isHostUser={selectedMember.userId === hostId}
          isSelf={selectedMember.userId === userId}
        />
      )}

      {selectedMember && modal?.type === 'report' && (
        <ReportModal
          open
          onClose={handleClose}
          targetId={selectedMember.userId}
          targetNickname={selectedMember.user?.nickname ?? '알 수 없음'}
        />
      )}
    </div>
  );
}
