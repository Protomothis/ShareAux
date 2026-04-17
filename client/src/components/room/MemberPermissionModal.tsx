'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import type { MemberWithPermission } from '@/api/model';
import { RoomPermissionPermissionsItem as PermItem, type RoomPermissionPermissionsItem, UserRole } from '@/api/model';
import {
  roomsControllerKick,
  roomsControllerTransferHost,
  roomsControllerUpdatePermissions,
  useRoomsControllerGetMyPermissions,
} from '@/api/rooms/rooms';
import { Button } from '@/components/ui/button';
import Modal from '@/components/common/Modal';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useInvalidate } from '@/hooks/useQueries';
import { getAvatar } from '@/lib/avatar';

const VISIBLE_PERMISSIONS: { key: RoomPermissionPermissionsItem; label: string; emoji: string }[] = [
  { key: PermItem.listen, label: '듣기', emoji: '🎵' },
  { key: PermItem.chat, label: '채팅', emoji: '💬' },
  { key: PermItem.reaction, label: '리액션', emoji: '😄' },
  { key: PermItem.addQueue, label: '곡 검색/신청', emoji: '🔍' },
  { key: PermItem.reorder, label: '순서 변경', emoji: '↕️' },
  { key: PermItem.voteSkip, label: '스킵 투표', emoji: '⏭️' },
];

interface MemberPermissionModalProps {
  open: boolean;
  onClose: () => void;
  member: MemberWithPermission;
  roomId: string;
  isHost: boolean;
  isHostUser: boolean;
  isSelf: boolean;
}

export default function MemberPermissionModal({
  open,
  onClose,
  member,
  roomId,
  isHost,
  isHostUser,
  isSelf,
}: MemberPermissionModalProps) {
  const roomPerms = member.permission?.permissions ?? [];
  const [saving, setSaving] = useState(false);
  const invalidate = useInvalidate();
  const canEdit = isHost && !isHostUser && !isSelf;
  const isGuest = member.user?.role === UserRole.guest;

  // 자기 자신일 때만 my-permissions API로 account/room 분리 정보 가져옴
  const { data: myPermsData } = useRoomsControllerGetMyPermissions(roomId, { query: { enabled: isSelf } });

  const togglePermission = async (perm: RoomPermissionPermissionsItem) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const has = roomPerms.includes(perm);
      let updated = has ? roomPerms.filter((p) => p !== perm) : [...roomPerms, perm];
      // addQueue와 search는 세트로 연동
      if (perm === PermItem.addQueue) {
        updated = has
          ? updated.filter((p) => p !== PermItem.search)
          : updated.includes(PermItem.search)
            ? updated
            : [...updated, PermItem.search];
      }
      await roomsControllerUpdatePermissions(roomId, member.userId, { permissions: updated });
      invalidate.room(roomId);
      toast.success('권한이 변경되었습니다');
    } catch {
      toast.error('변경 실패');
    }
    setSaving(false);
  };

  const handleTransfer = async () => {
    try {
      await roomsControllerTransferHost(roomId, member.userId);
      toast.success('DJ가 위임되었습니다');
      invalidate.room(roomId);
      onClose();
    } catch {
      toast.error('위임 실패');
    }
  };

  const handleKick = async () => {
    try {
      await roomsControllerKick(roomId, member.userId);
      toast.success('추방되었습니다');
      invalidate.room(roomId);
      onClose();
    } catch {
      toast.error('추방 실패');
    }
  };

  /** 권한 상태 판별 */
  const getPermStatus = (key: RoomPermissionPermissionsItem) => {
    if (isHostUser) return 'granted'; // DJ는 전부 허용

    if (isSelf && myPermsData) {
      const hasAccount = (myPermsData.accountPermissions as string[]).includes(key);
      const hasRoom = (myPermsData.roomPermissions as string[]).includes(key);
      if (hasAccount && hasRoom) return 'granted';
      if (!hasAccount) return 'blocked-account'; // 계정 레벨에서 제한
      return 'blocked-room'; // 방에서 제한
    }

    // 호스트가 다른 멤버를 볼 때
    return roomPerms.includes(key) ? 'granted' : 'blocked-room';
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-xs">
      <Modal.Header>
        <Modal.Title className="flex items-center gap-3">
          <img src={getAvatar(member.user?.nickname ?? member.userId)} alt="" className="size-10 rounded-full" />
          <div className="min-w-0">
            <p className="truncate text-base">{member.user?.nickname ?? 'Unknown'}</p>
            <p className="text-xs font-normal text-muted-foreground">
              {isHostUser ? '🎧 DJ' : isSelf ? '나' : isGuest ? '게스트' : '멤버'}
            </p>
          </div>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="space-y-0.5">
          {VISIBLE_PERMISSIONS.map(({ key, label, emoji }) => {
            const status = getPermStatus(key);
            const effective = status === 'granted';
            return (
              <div key={key} className="flex items-center justify-between rounded-lg px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${effective ? '' : 'opacity-40'}`}>
                    {emoji} {label}
                  </span>
                  {status === 'blocked-account' && (
                    <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[9px] text-yellow-400">계정 제한</span>
                  )}
                  {status === 'blocked-room' && !canEdit && (
                    <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] text-red-400">방 제한</span>
                  )}
                </div>
                {canEdit ? (
                  <Switch
                    checked={roomPerms.includes(key)}
                    onCheckedChange={() => togglePermission(key)}
                    disabled={saving || key === PermItem.listen}
                  />
                ) : (
                  <div className={`size-2 rounded-full ${effective ? 'bg-green-400' : 'bg-red-400'}`} />
                )}
              </div>
            );
          })}
        </div>

        {isSelf && isGuest && (
          <>
            <Separator />
            <p className="text-[11px] text-muted-foreground">
              💡 게스트 계정은 초대 코드에 설정된 권한까지만 사용할 수 있습니다. 방 권한이 있어도 계정 권한에 없으면
              제한됩니다.
            </p>
          </>
        )}

        {canEdit && (
          <div className="flex gap-2 pt-2">
            {!isGuest && (
              <Button variant="accent-ghost" size="sm" className="flex-1 text-xs" onClick={handleTransfer}>
                🎧 DJ 위임
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs text-red-400 bg-red-500/20 hover:bg-red-500/30"
              onClick={handleKick}
            >
              👋 추방
            </Button>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}
