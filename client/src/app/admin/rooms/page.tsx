'use client';

import { RefreshCw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { AdminRoomItem, LiveRoomItem } from '@/api/model';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { AdminTable } from '@/components/admin/AdminTable';
import type { Column } from '@/components/admin/AdminTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { RoomDetailModal } from '@/components/admin/RoomDetailModal';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { useAdminLiveRooms, useAdminRooms, useDeleteRoom } from '@/hooks/admin/useAdminRooms';
import { useTranslations } from 'next-intl';

const LIMIT = 20;

export default function AdminRoomsPage() {
  const t = useTranslations('admin.rooms');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<AdminRoomItem | null>(null);

  const { data, isLoading, refetch: refetchRooms } = useAdminRooms({ page, limit: LIMIT });
  const { data: liveRooms, refetch: refetchLive } = useAdminLiveRooms();
  const deleteRoom = useDeleteRoom();

  const liveMap = useMemo(() => new Map((liveRooms ?? []).map((r: LiveRoomItem) => [r.id, r])), [liveRooms]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteRoom.mutate(
      { id: deleteTarget },
      {
        onSuccess: () => {
          toast.success(t('deleted'));
          setDeleteTarget(null);
        },
      },
    );
  }, [deleteTarget, deleteRoom]);

  const columns: Column<AdminRoomItem>[] = [
    {
      key: 'name',
      header: t('roomName'),
      render: (room) => (
        <span className="font-medium text-white">{room.isPrivate ? `🔒 ${room.name}` : room.name}</span>
      ),
    },
    {
      key: 'host',
      header: t('host'),
      render: (room) => <span className="text-sa-text-muted">{room.host.nickname}</span>,
    },
    {
      key: 'members',
      header: t('members'),
      render: (room) => (
        <span className="text-sa-text-muted">
          {room.memberCount}/{room.maxMembers}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      render: (room) => {
        const live = liveMap.get(room.id);
        if (!live?.isStreaming) {
          return (
            <StatusBadge variant="muted">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-gray-500" />
              IDLE
            </StatusBadge>
          );
        }
        return (
          <StatusBadge variant="success">
            <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            LIVE
          </StatusBadge>
        );
      },
    },
    {
      key: 'stream',
      header: t('stream'),
      hideOnMobile: true,
      render: (room) => {
        const live = liveMap.get(room.id);
        if (!live?.codec) return <span className="text-sa-text-muted">—</span>;
        return (
          <span className="text-xs text-sa-text-muted">
            <span className="uppercase">{live.codec}</span> {live.bitrate}kbps
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: t('createdAt'),
      hideOnMobile: true,
      render: (room) => (
        <span className="text-sa-text-muted">{new Date(room.createdAt).toLocaleDateString('ko-KR')}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (room) => (
        <Button
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget(room.id);
          }}
        >
          {t('delete')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader title={t('title')}>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            void refetchRooms();
            void refetchLive();
          }}
          className="text-sa-text-muted"
        >
          <RefreshCw size={16} />
        </Button>
      </AdminPageHeader>
      <AdminTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        rowKey={(room) => room.id}
        emptyMessage={t('empty')}
        onRowClick={setSelectedRoom}
      />
      <AdminPagination page={page} totalPages={Math.ceil((data?.total ?? 0) / LIMIT)} onPageChange={setPage} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('deleteTitle')}
        description={t('deleteDesc')}
        confirmLabel={t('delete')}
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteRoom.isPending}
      />
      <RoomDetailModal
        room={selectedRoom}
        live={selectedRoom ? liveMap.get(selectedRoom.id) : undefined}
        onOpenChange={(open) => !open && setSelectedRoom(null)}
      />
    </div>
  );
}
