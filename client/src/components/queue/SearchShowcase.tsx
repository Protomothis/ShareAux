'use client';

import { Flame, History, Loader2, Music, Radio, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

import type { SearchResultItem, Track } from '@/api/model';
import { useSearchControllerGetRecommended, useSearchControllerGetShowcase } from '@/api/search/search';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import Thumbnail from '@/components/common/Thumbnail';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

interface SearchShowcaseProps {
  roomId: string;
  onSelectTrack: (track: SearchResultItem) => void;
  selectedIds: Set<string>;
  selectedOrder: string[];
  disabledIds: Set<string>;
  maxReached: boolean;
  favoriteIds?: Set<string>;
  onToggleFavorite?: (track: SearchResultItem) => void;
  isGuest?: boolean;
}

function Section({
  icon,
  title,
  onRefresh,
  refreshing,
  children,
}: {
  icon: ReactNode;
  title: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 px-1">
        {icon}
        <h3 className="text-xs font-bold uppercase tracking-wider text-sa-text-secondary">{title}</h3>
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onRefresh}
            className="ml-auto text-sa-text-muted hover:text-white"
          >
            {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

function GridCard({
  track,
  selected,
  disabled,
  order,
  onClick,
  isFavorite,
  onToggleFavorite,
  isGuest,
}: {
  track: SearchResultItem;
  selected: boolean;
  disabled: boolean;
  order: number;
  onClick: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isGuest?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-auto flex-col gap-2 overflow-hidden rounded-xl border p-1.5 whitespace-normal',
        selected ? 'border-sa-accent/50 bg-sa-accent/10' : 'border-transparent',
        disabled && 'opacity-40',
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-lg">
        <Thumbnail src={track.thumbnail} size="md" className="h-full w-full rounded-lg" />
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] tabular-nums text-white/80">
          {formatDuration(track.durationMs)}
        </span>
        {selected && (
          <div className="absolute left-1 top-1">
            <span className="flex size-5 items-center justify-center rounded-full bg-sa-accent text-[10px] font-bold text-white shadow">
              {order}
            </span>
          </div>
        )}
        {!isGuest && onToggleFavorite && !selected && (
          <FavoriteButton active={!!isFavorite} onClick={onToggleFavorite} className="absolute left-1 top-1" />
        )}
      </div>
      <div className="min-w-0 w-full px-0.5">
        <p className="line-clamp-2 text-left text-[11px] font-medium leading-tight text-white">{track.name}</p>
        <p className="mt-0.5 truncate text-left text-[10px] text-sa-text-muted">{track.artist}</p>
      </div>
    </Button>
  );
}

function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl p-1.5">
          <div className="aspect-video w-full animate-pulse rounded-lg bg-white/[0.06]" />
          <div className="space-y-1 px-0.5">
            <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
            <div className="h-2.5 w-2/3 animate-pulse rounded bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SearchShowcase({
  roomId,
  onSelectTrack,
  selectedIds,
  selectedOrder,
  disabledIds,
  maxReached,
  favoriteIds,
  onToggleFavorite,
  isGuest,
}: SearchShowcaseProps) {
  const { data: showcaseData, isLoading: showcaseLoading } = useSearchControllerGetShowcase(roomId);
  const {
    data: recData,
    isLoading: recLoading,
    isFetching: recFetching,
    refetch: recRefetch,
  } = useSearchControllerGetRecommended(roomId);

  const handleClick = (track: SearchResultItem) => {
    if (disabledIds.has(track.sourceId) || (maxReached && !selectedIds.has(track.sourceId))) return;
    const { provider, sourceId, name, durationMs } = track;
    onSelectTrack({
      provider,
      sourceId,
      name,
      artist: track.artist ?? null,
      thumbnail: track.thumbnail ?? null,
      durationMs,
    });
  };

  const toSearchItem = (t: Track): SearchResultItem => ({
    provider: t.provider,
    sourceId: t.sourceId,
    name: t.name,
    artist: t.artist ?? null,
    thumbnail: t.thumbnail ?? null,
    durationMs: t.durationMs,
  });

  const grid = (tracks: SearchResultItem[]) => (
    <div className="grid grid-cols-3 gap-1">
      {tracks.map((t) => (
        <GridCard
          key={t.sourceId}
          track={t}
          selected={selectedIds.has(t.sourceId)}
          disabled={disabledIds.has(t.sourceId)}
          order={selectedOrder.indexOf(t.sourceId) + 1}
          onClick={() => handleClick(t)}
          isFavorite={favoriteIds?.has(t.sourceId)}
          onToggleFavorite={() => onToggleFavorite?.(t)}
          isGuest={isGuest}
        />
      ))}
    </div>
  );

  const { popular = [], recent = [], myHistory = [] } = showcaseData ?? {};
  const recommended = recData?.recommended ?? [];
  const allEmpty =
    !showcaseLoading && !recLoading && !popular.length && !recent.length && !myHistory.length && !recommended.length;

  if (allEmpty) {
    return (
      <div className="py-16 text-center">
        <Music size={32} className="mx-auto mb-3 text-white/10" />
        <p className="text-sm text-sa-text-muted">아직 재생 기록이 없습니다</p>
        <p className="mt-1 text-xs text-sa-text-muted">검색 탭에서 곡을 추가해보세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 인기/내기록/최근 — showcase 쿼리 (빠름) */}
      {showcaseLoading ? (
        <div>
          <div className="mb-3 flex items-center gap-2 px-1">
            <div className="size-3.5 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
          </div>
          <GridSkeleton />
        </div>
      ) : (
        <>
          {popular.length > 0 && (
            <Section icon={<Flame size={14} className="text-orange-400" />} title="인기곡">
              {grid(popular.map(toSearchItem))}
            </Section>
          )}
          {myHistory.length > 0 && (
            <Section icon={<Music size={14} className="text-sa-accent" />} title="내 신청 기록">
              {grid(myHistory.map(toSearchItem))}
            </Section>
          )}
          {recent.length > 0 && (
            <Section icon={<History size={14} className="text-sa-text-muted" />} title="최근 재생">
              {grid(recent.map(toSearchItem))}
            </Section>
          )}
        </>
      )}

      {/* 추천 — 별도 쿼리, 독립 로딩 (느림) */}
      {recLoading ? (
        <div>
          <div className="mb-3 flex items-center gap-2 px-1">
            <div className="size-3.5 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
          </div>
          <GridSkeleton />
        </div>
      ) : recommended.length > 0 ? (
        <Section
          icon={<Radio size={14} className="text-green-400" />}
          title="추천곡"
          onRefresh={() => recRefetch()}
          refreshing={recFetching}
        >
          {grid(recommended)}
        </Section>
      ) : null}
    </div>
  );
}
