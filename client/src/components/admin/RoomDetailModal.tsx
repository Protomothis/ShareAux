'use client';

import type { AdminRoomItem, LiveRoomItem } from '@/api/model';
import { StatusBadge } from '@/components/admin/StatusBadge';
import Modal from '@/components/common/Modal';
import { useTranslations } from 'next-intl';

interface RoomDetailModalProps {
  room: AdminRoomItem | null;
  live?: LiveRoomItem;
  onOpenChange: (open: boolean) => void;
}

export function RoomDetailModal({
  room, live, onOpenChange }: RoomDetailModalProps) {
  const t = useTranslations('admin.rooms');
  if (!room) return null;

  const isLive = live?.isStreaming ?? false;

  return (
    <Modal open={!!room} onOpenChange={onOpenChange} className="sm:max-w-md">
      <Modal.Header>
        <Modal.Title>{room.isPrivate ? `🔒 ${room.name}` : room.name}</Modal.Title>
        <Modal.Description>{t('roomDetail')}</Modal.Description>
      </Modal.Header>

      <Modal.Body>
        <div className="space-y-3 text-sm">
          <Row label={t('host')} value={room.host.nickname} />
          <Row label={t('status')}>
            {isLive ? (
              <StatusBadge variant="success">
                <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                LIVE
              </StatusBadge>
            ) : (
              <StatusBadge variant="muted">IDLE</StatusBadge>
            )}
          </Row>
          <Row label={t('members')} value={`${room.memberCount} / ${room.maxMembers}`} />
          {live?.codec && <Row label={t('stream')} value={`${live.codec.toUpperCase()} ${live.bitrate}kbps`} />}
          <Row label={t('createdAt')} value={new Date(room.createdAt).toLocaleDateString('ko-KR')} />

          <div className="border-t border-white/5 pt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-sa-text-muted">{t('settingsLabel')}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <SettingItem label={t('private')} value={room.isPrivate} />
              <SettingItem label={t('crossfadeLabel')} value={room.crossfade} />
              <SettingItem label="Auto DJ" value={room.autoDjEnabled} />
              <SettingItem label={t('defaultEnqueue')} value={room.defaultEnqueueEnabled} />
              <SettingItem label={t('defaultVoteSkip')} value={room.defaultVoteSkipEnabled} />
            </div>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sa-text-muted">{label}</span>
      {children ?? <span className="text-white">{value}</span>}
    </div>
  );
}

function SettingItem({ label, value }: { label: string; value: boolean }) {
  return (
    <span className={value ? 'text-emerald-400' : 'text-sa-text-muted'}>
      {value ? '✓' : '✕'} {label}
    </span>
  );
}
