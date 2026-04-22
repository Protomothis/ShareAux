'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Music, ThumbsDown, ThumbsUp, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

import {
  adminControllerDeleteTrack,
  adminControllerGetTrackLyrics,
  adminControllerResetTrackLyrics,
  adminControllerResetTrackMeta,
} from '@/api/admin/admin';
import type { TrackRankingItem } from '@/api/model';
import {
  TrackRankingTrackInfoLyricsStatus,
  TrackRankingTrackInfoLyricsType,
  TrackRankingTrackInfoMetaStatus,
} from '@/api/model';
import { StatusBadge } from '@/components/admin/StatusBadge';
import Modal from '@/components/common/Modal';

interface TrackDetailModalProps {
  track: TrackRankingItem | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function TrackDetailModal({ track: trackProp, onOpenChange, onDeleted }: TrackDetailModalProps) {
  const [localTrack, setLocalTrack] = useState(trackProp);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [translated, setTranslated] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsTab, setLyricsTab] = useState<'original' | 'translated'>('original');

  useEffect(() => {
    setLocalTrack(trackProp);
  }, [trackProp]);

  const track = localTrack;

  useEffect(() => {
    setLyrics(null);
    setTranslated(null);
    setLyricsTab('original');
    if (!track || track.track.lyricsStatus !== TrackRankingTrackInfoLyricsStatus.found) return;
    setLyricsLoading(true);
    adminControllerGetTrackLyrics(track.trackId)
      .then((r) => {
        setLyrics(r.synced ?? null);
        setTranslated(r.translated ?? null);
      })
      .catch(() => setLyrics(null))
      .finally(() => setLyricsLoading(false));
  }, [track]);

  if (!track) return null;

  return (
    <Modal open={!!track} onOpenChange={onOpenChange} className="sm:max-w-md">
      <Modal.Header>
        <Modal.Title className="leading-snug">{track.track.songTitle ?? track.track.name}</Modal.Title>
        <Modal.Description>{track.track.songArtist ?? track.track.artist}</Modal.Description>
      </Modal.Header>

      <Modal.Body>
        <div className="space-y-3 text-sm">
          {/* 원본 YouTube 정보 */}
          {track.track.songTitle && (
            <div className="space-y-1 rounded-xl bg-white/[0.03] p-3 text-xs text-sa-text-muted">
              <div className="truncate">원본: {track.track.name}</div>
              <div className="truncate">채널: {track.track.artist}</div>
              {track.track.songAlbum && <div className="truncate">앨범: {track.track.songAlbum}</div>}
            </div>
          )}
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
            <div className="flex items-center gap-1.5">
              {track.track.lyricsStatus === TrackRankingTrackInfoLyricsStatus.found ? (
                <StatusBadge variant="success">
                  {track.track.lyricsType === TrackRankingTrackInfoLyricsType.karaoke ? 'KLRC' : 'LRC'}{' '}
                  {track.track.lyricsLang?.toUpperCase() ?? ''}
                  {track.track.hasTranslation ? ' 번역' : ''}
                </StatusBadge>
              ) : track.track.lyricsStatus === TrackRankingTrackInfoLyricsStatus.not_found ? (
                <StatusBadge variant="danger">없음</StatusBadge>
              ) : (
                <StatusBadge variant="muted">검색중</StatusBadge>
              )}
              {track.track.lyricsStatus !== TrackRankingTrackInfoLyricsStatus.searching && (
                <button
                  onClick={async () => {
                    if (!confirm('가사 정보를 삭제하시겠습니까? 다음 재생 시 재검색됩니다.')) return;
                    await adminControllerResetTrackLyrics(track.trackId);
                    toast.success('가사 삭제 완료');
                    setLyrics(null);
                    setTranslated(null);
                    setLocalTrack((prev) =>
                      prev
                        ? {
                            ...prev,
                            track: {
                              ...prev.track,
                              lyricsStatus: TrackRankingTrackInfoLyricsStatus.searching,
                              lyricsLang: null,
                              lyricsType: null,
                              hasTranslation: false,
                            },
                          }
                        : prev,
                    );
                  }}
                  className="text-red-400/60 hover:text-red-400"
                  title="가사 삭제"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sa-text-muted">Content ID 매칭</span>
            <div className="flex items-center gap-1.5">
              {track.track.metaStatus === TrackRankingTrackInfoMetaStatus.done ? (
                <StatusBadge variant="success">완료</StatusBadge>
              ) : (
                <StatusBadge variant="muted">대기</StatusBadge>
              )}
              {track.track.metaStatus === TrackRankingTrackInfoMetaStatus.done && (
                <button
                  onClick={async () => {
                    if (!confirm('Content ID 매칭 정보를 삭제하시겠습니까? 다음 재생 시 재매칭됩니다.')) return;
                    await adminControllerResetTrackMeta(track.trackId);
                    toast.success('Content ID 삭제 완료');
                    setLocalTrack((prev) =>
                      prev
                        ? { ...prev, track: { ...prev.track, metaStatus: TrackRankingTrackInfoMetaStatus.pending } }
                        : prev,
                    );
                  }}
                  className="text-red-400/60 hover:text-red-400"
                  title="Content ID 삭제"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {lyrics && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLyricsTab('original')}
                  className={`text-xs ${lyricsTab === 'original' ? 'text-sa-accent' : 'text-sa-text-muted hover:text-sa-text-secondary'}`}
                >
                  원문
                </button>
                {translated && (
                  <button
                    onClick={() => setLyricsTab('translated')}
                    className={`text-xs ${lyricsTab === 'translated' ? 'text-sa-accent' : 'text-sa-text-muted hover:text-sa-text-secondary'}`}
                  >
                    번역
                  </button>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg bg-white/[0.03] p-3 text-xs leading-relaxed text-sa-text-secondary">
                {stripLrcTimestamps(lyricsTab === 'translated' && translated ? translated : lyrics)}
              </div>
            </div>
          )}
          {lyricsLoading && <p className="text-xs text-sa-text-muted">가사 불러오는 중...</p>}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button
          onClick={async () => {
            if (!confirm('이 트랙을 삭제하시겠습니까? 관련 큐/통계도 함께 삭제됩니다.')) return;
            await adminControllerDeleteTrack(track.trackId);
            toast.success('트랙 삭제 완료');
            onOpenChange(false);
            onDeleted?.();
          }}
          className="text-xs text-red-400 hover:text-red-300"
        >
          트랙 삭제
        </button>
      </Modal.Footer>
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

function stripLrcTimestamps(lrc: string): React.ReactNode {
  const lines = lrc
    .split('\n')
    .map((l) =>
      l
        .replace(/\[\d{2}:\d{2}[.\d]*\]/g, '')
        .replace(/<\d{2}:\d{2}[.\d]*>/g, '')
        .trim(),
    )
    .filter((l) => l.length > 0);
  return lines.map((l, i) => (
    <p key={i} className="min-h-[1.25rem]">
      {l}
    </p>
  ));
}
