'use client';

import { ChevronDown, ListMusic, Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import type { PlaylistResult } from '@/api/model';
import { searchControllerGetPlaylistTracks } from '@/api/search/search';
import { Button } from '@/components/ui/button';

import { SearchTrackItem } from './SearchTrackItem';
import type { SearchResultItem } from '@/api/model';
import { useTranslations } from 'next-intl';

interface SearchPlaylistItemProps {
  playlist: PlaylistResult;
  selected: SearchResultItem[];
  disabledIds: Set<string>;
  maxReached: boolean;
  onToggleTrack: (track: SearchResultItem) => void;
  favoriteIds: Set<string>;
  favLoadingIds: Set<string>;
  onToggleFavorite: (track: SearchResultItem) => void;
  isGuest: boolean;
}

const LIMIT = 20;

export function SearchPlaylistItem({
  playlist,
  selected,
  disabledIds,
  maxReached,
  onToggleTrack,
  favoriteIds,
  favLoadingIds,
  onToggleFavorite,
  isGuest,
}: SearchPlaylistItemProps) {
  const t = useTranslations('search');
  const [open, setOpen] = useState(false);
  const [tracks, setTracks] = useState<SearchResultItem[]>([]);
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
        <span className="text-xs text-sa-text-muted">{t('playlist.trackCount', { count: playlist.videoCount })}</span>
        <ChevronDown size={16} className={`shrink-0 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>

      {/* Expanded tracks */}
      {open && (
        <div className="ml-2 mt-1 border-l border-white/10 pl-3 space-y-0.5">
          {tracks.map((track) => {
            const order = selected.findIndex((t) => t.sourceId === track.sourceId) + 1;

            return (
              <SearchTrackItem
                key={track.sourceId}
                track={track}
                order={order}
                disabled={disabledIds.has(track.sourceId)}
                full={!order && maxReached}
                inQueue={disabledIds.has(track.sourceId)}
                onClick={() => onToggleTrack(track)}
                isFavorite={favoriteIds.has(track.sourceId)}
                favLoading={favLoadingIds.has(track.sourceId)}
                onToggleFavorite={() => onToggleFavorite(track)}
                isGuest={isGuest}
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
              <span>{t('playlist.loadError')}</span>
              <Button variant="link" onClick={() => void fetchPage(page || 1)} className="text-sa-accent">
                {t('playlist.retry')}
              </Button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && fetched.current && tracks.length === 0 && (
            <p className="py-3 text-center text-xs text-sa-text-muted">{t('playlist.noTracks')}</p>
          )}

          {/* Load more */}
          {!loading && !error && total > page * LIMIT && (
            <Button
              variant="link"
              onClick={() => void fetchPage(page + 1)}
              className="w-full py-2 text-xs text-sa-accent"
            >
              {t('playlist.loadMore', { loaded: tracks.length, total })}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
