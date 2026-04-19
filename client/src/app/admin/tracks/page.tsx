'use client';

import { Music, ThumbsDown, ThumbsUp, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { TrackRankingItem } from '@/api/model';
import { TrackRankingTrackInfoLyricsStatus, TrackRankingTrackInfoLyricsType } from '@/api/model';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminTable } from '@/components/admin/AdminTable';
import type { Column } from '@/components/admin/AdminTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { TrackDetailModal } from '@/components/admin/TrackDetailModal';
import { useAdminTopTracks } from '@/hooks/admin/useAdminTracks';

const columns: Column<TrackRankingItem>[] = [
  {
    key: 'rank',
    header: '#',
    width: '3rem',
    primary: true,
    render: (_, i) => (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/5 font-mono text-xs text-sa-text-muted">
        {(i ?? 0) + 1}
      </span>
    ),
  },
  {
    key: 'name',
    header: '트랙',
    primary: true,
    render: (item) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-white">{item.track.name}</div>
        {item.track.songArtist && <div className="truncate text-xs text-sa-text-muted">{item.track.songArtist}</div>}
      </div>
    ),
  },
  {
    key: 'plays',
    header: '재생',
    width: '5rem',
    render: (item) => (
      <span className="flex items-center gap-1 text-white">
        <Music size={12} className="text-sa-accent" /> {item.totalPlays}
      </span>
    ),
  },
  {
    key: 'votes',
    header: '투표',
    width: '7rem',
    hideOnMobile: true,
    render: (item) => (
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-0.5 text-green-400">
          <ThumbsUp size={11} /> {item.likes}
        </span>
        <span className="flex items-center gap-0.5 text-red-400">
          <ThumbsDown size={11} /> {item.dislikes}
        </span>
      </div>
    ),
  },
  {
    key: 'users',
    header: '유저',
    width: '4rem',
    hideOnMobile: true,
    render: (item) => <span className="text-sa-text-muted">{item.uniqueUsers}</span>,
  },
  {
    key: 'lyrics',
    header: '가사',
    width: '7rem',
    hideOnMobile: true,
    render: (item) => {
      const s = item.track.lyricsStatus;
      const lang = item.track.lyricsLang;
      const translated = item.track.hasTranslation;
      const type = item.track.lyricsType === TrackRankingTrackInfoLyricsType.karaoke ? 'KLRC' : 'LRC';
      return s === TrackRankingTrackInfoLyricsStatus.found ? (
        <StatusBadge variant="success">
          {type} {lang?.toUpperCase() ?? ''}
          {translated ? ' 번역' : ''}
        </StatusBadge>
      ) : s === TrackRankingTrackInfoLyricsStatus.not_found ? (
        <StatusBadge variant="danger">없음</StatusBadge>
      ) : (
        <StatusBadge variant="muted">검색중</StatusBadge>
      );
    },
  },
  {
    key: 'score',
    header: '점수',
    width: '5rem',
    render: (item) => (
      <StatusBadge variant="accent">
        <TrendingUp size={10} className="mr-0.5" /> {item.score.toFixed(1)}
      </StatusBadge>
    ),
  },
];

export default function AdminTracksPage() {
  const [search, setSearch] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<TrackRankingItem | null>(null);
  const { data, isLoading, refetch } = useAdminTopTracks({ limit: 50 });

  const filtered = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.toLowerCase();
    return (data ?? []).filter(
      (item) => item.track.name.toLowerCase().includes(q) || item.track.songArtist?.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div>
      <AdminPageHeader
        title="🎵 인기 트랙"
        search={{ value: search, onChange: setSearch, placeholder: '트랙 검색...' }}
      />
      <AdminTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        rowKey={(item) => item.trackId}
        emptyMessage="재생 기록이 없습니다"
        maxHeight="calc(100vh - 10rem)"
        onRowClick={setSelectedTrack}
      />
      <TrackDetailModal
        track={selectedTrack}
        onOpenChange={(open) => !open && setSelectedTrack(null)}
        onDeleted={() => refetch()}
      />
    </div>
  );
}
