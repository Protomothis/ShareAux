'use client';

import { ExternalLink, Music, ThumbsDown, ThumbsUp, Users } from 'lucide-react';

import type { TrackRankingItem } from '@/api/model';
import { StatusBadge } from '@/components/admin/StatusBadge';
import Modal from '@/components/common/Modal';

interface TrackDetailModalProps {
  track: TrackRankingItem | null;
  onOpenChange: (open: boolean) => void;
}

export function TrackDetailModal({ track, onOpenChange }: TrackDetailModalProps) {
  if (!track) return null;

  return (
    <Modal open={!!track} onOpenChange={onOpenChange} className="sm:max-w-md">
      <Modal.Header>
        <Modal.Title className="leading-snug">{track.track.name}</Modal.Title>
        {track.track.songArtist && <Modal.Description>{track.track.songArtist}</Modal.Description>}
      </Modal.Header>

      <Modal.Body>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-sa-text-muted">YouTube</span>
            <a
              href={`https://www.youtube.com/watch?v=${track.track.sourceId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sa-accent hover:underline"
            >
              {track.track.sourceId}
              <ExternalLink size={12} />
            </a>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-xl bg-white/[0.03] p-3">
            <Stat icon={<Music size={14} />} label="재생" value={track.totalPlays} />
            <Stat icon={<Users size={14} />} label="유저" value={track.uniqueUsers} />
            <Stat label="점수" value={track.score.toFixed(1)} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sa-text-muted">투표</span>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-emerald-400">
                <ThumbsUp size={13} /> {track.likes}
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <ThumbsDown size={13} /> {track.dislikes}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sa-text-muted">가사</span>
            {track.track.lyricsStatus === 'found' ? (
              <StatusBadge variant="success">{track.track.lyricsLang?.toUpperCase() ?? '있음'}</StatusBadge>
            ) : track.track.lyricsStatus === 'not_found' ? (
              <StatusBadge variant="danger">없음</StatusBadge>
            ) : (
              <StatusBadge variant="muted">검색중</StatusBadge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sa-text-muted">메타</span>
            {track.track.metaStatus === 'done' ? (
              <StatusBadge variant="success">완료</StatusBadge>
            ) : (
              <StatusBadge variant="muted">대기</StatusBadge>
            )}
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-sa-accent">
        {icon}
        {value}
      </div>
      <div className="mt-0.5 text-[10px] text-sa-text-muted">{label}</div>
    </div>
  );
}
