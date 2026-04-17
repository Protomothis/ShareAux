'use client';

import { ChevronDown, ListMusic, Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import type { PlaylistResult, Track } from '@/api/model';
import { searchControllerGetPlaylistTracks } from '@/api/search/search';
import { Button } from '@/components/ui/button';

import { SearchTrackItem } from './SearchTrackItem';

interface SearchPlaylistItemProps {
  playlist: PlaylistResult;
  selected: Track[];
  disabledIds: Set<string>;
  maxReached: boolean;
  onToggleTrack: (track: Track) => void;
}

const LIMIT = 20;

export function SearchPlaylistItem({
  playlist,
  selected,
  disabledIds,
  maxReached,
  onToggleTrack,
}: SearchPlaylistItemProps) {
  const [open, setOpen] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const fetched = useRef(false);

  const fetchPage = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(false);
      try {
        const res = await searchControllerGetPlaylistTracks(playlist.playlistId, { page: p, limit: LIMIT });
        setTracks((prev) => (p === 1 ? res.tracks : [...prev, ...res.tracks]));
        setTotal(res.total);
        setPage(p);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [playlist.playlistId],
  );

  const handleToggle = () => {
    setOpen((prev) => {
      if (!prev && !fetched.current) {
        fetched.current = true;
        void fetchPage(1);
      }
      return !prev;
    });
  };

  return (
    <div>
      {/* Collapsed header */}
      <Button
        variant="ghost"
        onClick={handleToggle}
        className="flex h-auto w-full items-center gap-3 rounded-xl p-2 text-left"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded bg-sa-accent/20">
          <ListMusic size={18} className="text-sa-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{playlist.title}</p>
          <p className="truncate text-xs text-sa-text-muted">{playlist.channelName}</p>
        </div>
        <span className="text-xs text-sa-text-muted">{playlist.videoCount}곡</span>
        <ChevronDown size={16} className={`shrink-0 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>

      {/* Expanded tracks */}
      {open && (
        <div className="ml-2 mt-1 border-l border-white/10 pl-3 space-y-0.5">
          {tracks.map((track) => {
            const order = selected.findIndex((t) => t.id === track.id) + 1;

            return (
              <SearchTrackItem
                key={track.id}
                track={track}
                order={order}
                disabled={disabledIds.has(track.id)}
                full={!order && maxReached}
                inQueue={disabledIds.has(track.id)}
                onClick={() => onToggleTrack(track)}
              />
            );
          })}

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-3">
              <Loader2 size={18} className="animate-spin text-white/40" />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex flex-col items-center gap-1 py-3 text-xs text-sa-text-muted">
              <span>플레이리스트를 불러올 수 없습니다</span>
              <Button variant="link" onClick={() => void fetchPage(page || 1)} className="text-sa-accent">
                다시 시도
              </Button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && fetched.current && tracks.length === 0 && (
            <p className="py-3 text-center text-xs text-sa-text-muted">재생 가능한 곡이 없습니다</p>
          )}

          {/* Load more */}
          {!loading && !error && total > page * LIMIT && (
            <Button
              variant="link"
              onClick={() => void fetchPage(page + 1)}
              className="w-full py-2 text-xs text-sa-accent"
            >
              더 보기 ({tracks.length}/{total})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
