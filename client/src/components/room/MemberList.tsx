'use client';

import { useMemo, useState } from 'react';

import type { MemberWithPermission } from '@/api/model';
import type { DisplayRole } from '@/lib/roles';
import { getDisplayRole } from '@/lib/roles';

import MemberItem from './MemberItem';
import MemberPermissionModal from './MemberPermissionModal';

interface MemberListProps {
  members: MemberWithPermission[];
  hostId: string;
  roomId: string;
  isHost?: boolean;
  userId?: string;
}

export default function MemberList({ members, hostId, roomId, isHost, userId }: MemberListProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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
              onSelect={() => setSelectedUserId(m.userId)}
            />
          ))
        )}
      </div>

      {selectedMember && (
        <MemberPermissionModal
          open
          onClose={() => setSelectedUserId(null)}
          member={selectedMember}
          roomId={roomId}
          isHost={!!isHost}
          isHostUser={selectedMember.userId === hostId}
          isSelf={selectedMember.userId === userId}
        />
      )}
    </div>
  );
}
