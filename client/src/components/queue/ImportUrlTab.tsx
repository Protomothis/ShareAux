'use client';

import { CheckCheck, Heart, Link2, ListPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import type { SearchResultItem } from '@/api/model';
import { searchControllerImportByUrl } from '@/api/search/search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isSupportedMediaUrl } from '@/lib/media-url';
import { cn } from '@/lib/utils';
import type { PlaylistTrack } from '@/types';

import SearchSkeleton from './SearchSkeleton';
import { SearchTrackItem } from './SearchTrackItem';

interface ImportUrlTabProps {
  onAddToQueue: (tracks: PlaylistTrack[]) => void;
  onAddToFavorites: (tracks: PlaylistTrack[]) => void;
  onClose?: () => void;
  adding?: boolean;
  maxSelect?: number;
}

/** PlaylistTrack → SearchResultItem 변환 */
function toSearchItem(track: PlaylistTrack): SearchResultItem {
  return {
    provider: 'yt' as SearchResultItem['provider'],
    sourceId: track.sourceId,
    name: track.name,
    artist: track.artist ?? null,
    thumbnail: track.thumbnail ?? null,
    durationMs: track.durationMs,
  };
}

export function ImportUrlTab({ onAddToQueue, onAddToFavorites, onClose, adding = false, maxSelect = 50 }: ImportUrlTabProps) {
  const t = useTranslations('search.importUrl');
  const [url, setUrl] = useState('');
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // 탭 진입 시 클립보드에 URL이 있으면 자동 채움
  useEffect(() => {
    navigator.clipboard.readText().then((text) => {
      if (isSupportedMediaUrl(text)) {
        setUrl(text.trim());
      }
    }).catch(() => { /* 권한 거부 무시 */ });
  }, []);

  const availableTracks = tracks.filter((tr) => tr.available);
  const allSelected = availableTracks.length > 0 && availableTracks.every((tr) => selected.has(tr.sourceId));

  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(undefined);
    setTracks([]);
    setSelected(new Set());

    try {
      const res = await searchControllerImportByUrl({ url: trimmed });
      setTracks(res.tracks);
      setUrl('');
    } catch {
      setError(t('loadError'));
    } finally {
      setLoading(false);
    }
  };

  const toggleTrack = useCallback((sourceId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }, []);

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(availableTracks.slice(0, maxSelect).map((tr) => tr.sourceId)));
    }
  };

  const selectedTracks = tracks.filter((tr) => selected.has(tr.sourceId));
  const selectedOrder = [...selected];

  return (
    <div className="flex h-full flex-col">
      {/* URL 입력 */}
      <div className="flex items-center gap-2 pb-3">
        <div className="relative flex-1">
          <Link2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sa-text-muted" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            placeholder={t('placeholder')}
            disabled={loading}
            clearable
            onClear={() => setUrl('')}
            className="w-full rounded-xl border-white/10 bg-white/5 py-2.5 pl-9 pr-8 text-sm text-white placeholder:text-sa-text-muted"
          />
        </div>
        <Button variant="accent" onClick={handleFetch} loading={loading} disabled={!url.trim()}>
          {t('fetch')}
        </Button>
      </div>

      {/* 에러 */}
      {error && (
        <div className="flex flex-col items-center gap-2 py-8">
          <p className="text-center text-sm text-red-400">{error}</p>
          <Button variant="ghost" size="sm" onClick={handleFetch} className="text-sa-text-secondary">
            {t('retry')}
          </Button>
        </div>
      )}

      {/* 로딩 스켈레톤 */}
      {loading && tracks.length === 0 && (
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <SearchSkeleton key={i} />
          ))}
        </div>
      )}

      {/* 곡 목록 */}
      {tracks.length > 0 && (
        <>
          {/* 전체선택 + 카운트 (2곡 이상일 때만) */}
          {tracks.length > 1 && (
            <div className="flex items-center justify-between pb-2">
              <Button variant="ghost" size="sm" onClick={toggleAll} className="gap-1.5 text-xs text-sa-text-secondary">
                <CheckCheck size={14} />
                {allSelected ? t('deselectAll') : t('selectAll')}
              </Button>
              <span className="text-xs text-sa-text-muted">
                {t('selected', { count: selected.size, total: tracks.length })}
              </span>
            </div>
          )}

          {/* 트랙 리스트 */}
          <div className="flex-1 space-y-1 overflow-y-auto">
            {tracks.map((track) => {
              const order = selectedOrder.indexOf(track.sourceId) + 1;
              return (
                <SearchTrackItem
                  key={track.sourceId}
                  track={toSearchItem(track)}
                  order={order}
                  disabled={!selected.has(track.sourceId) && selected.size >= maxSelect}
                  full={selected.size >= maxSelect}
                  inQueue={false}
                  onClick={() => toggleTrack(track.sourceId)}
                  unavailable={!track.available}
                  unavailableLabel={t('unavailable')}
                />
              );
            })}
          </div>

          {/* 액션바 */}
          {selected.size > 0 && (
            <div className={cn('flex gap-2 border-t border-white/10 pt-3', adding && 'pointer-events-none')}>
              <Button
                variant="accent"
                size="sm"
                className="flex-1 gap-1.5"
                loading={adding}
                onClick={() => {
                  onAddToQueue(selectedTracks);
                  onClose?.();
                }}
              >
                <ListPlus size={14} />
                {t('addToQueue', { count: selected.size })}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 border border-white/10"
                disabled={adding}
                onClick={() => onAddToFavorites(selectedTracks)}
              >
                <Heart size={14} />
                {t('addToFavorites')}
              </Button>
            </div>
          )}
        </>
      )}

      {/* 빈 상태 */}
      {!loading && !error && tracks.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sa-text-muted">
          <Link2 size={32} className="opacity-30" />
          <p className="text-sm">{t('emptyHint')}</p>
        </div>
      )}
    </div>
  );
}
