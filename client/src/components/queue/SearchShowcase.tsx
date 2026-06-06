'use client';

import { Loader2, Music } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { ChartTrack, SearchResultItem, ShowcaseCategory, Track } from '@/api/model';
import {
  useSearchControllerGetRadio,
  useSearchControllerGetRecommended,
  useSearchControllerGetShowcase,
} from '@/api/search/search';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import Thumbnail from '@/components/common/Thumbnail';
import { Button } from '@/components/common/Button';
import { PaginationBar } from '@/components/common/PaginationBar';
import { SkeletonLine } from '@/components/ui/skeleton';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import { usePreferencesStore } from '@/stores/preferences';

import { SearchTrackItem } from './SearchTrackItem';
import { ViewModeToggle } from './ViewModeToggle';

interface SearchShowcaseProps {
  roomId: string;
  onSelectTrack: (track: SearchResultItem) => void;
  selectedIds: Set<string>;
  selectedOrder: string[];
  disabledIds: Set<string>;
  maxReached: boolean;
  favoriteIds?: Set<string>;
  favLoadingIds?: Set<string>;
  onToggleFavorite?: (track: SearchResultItem) => void;
  isGuest?: boolean;
}

function GridCard({
  track,
  selected,
  disabled,
  order,
  onClick,
  isFavorite,
  onToggleFavorite,
  favLoading,
  isGuest,
}: {
  track: SearchResultItem;
  selected: boolean;
  disabled: boolean;
  order: number;
  onClick: () => void;
  isFavorite?: boolean;
  favLoading?: boolean;
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
        {track.durationMs > 0 && (
          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] tabular-nums text-white/80">
            {formatDuration(track.durationMs)}
          </span>
        )}
        {selected && (
          <div className="absolute left-1 top-1">
            <span className="flex size-5 items-center justify-center rounded-full bg-sa-accent text-[10px] font-bold text-white shadow">
              {order}
            </span>
          </div>
        )}
        {!isGuest && onToggleFavorite && !selected && (
          <FavoriteButton
            active={!!isFavorite}
            onClick={onToggleFavorite}
            loading={favLoading}
            className="absolute left-1 top-1"
          />
        )}
      </div>
      <div className="min-w-0 w-full flex-1 px-0.5">
        <p className="line-clamp-2 break-words text-left text-[11px] font-medium leading-tight text-white">
          {track.name}
        </p>
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
          <SkeletonLine className="aspect-video w-full rounded-lg" />
          <div className="space-y-1 px-0.5">
            <SkeletonLine className="h-3 w-full" />
            <SkeletonLine className="h-2.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 통합 쇼케이스 (칩 탭 + 콘텐츠) ─────────────────────

function chartTrackToSearchItem(ct: ChartTrack): SearchResultItem {
  return {
    provider: 'yt',
    sourceId: ct.sourceId,
    name: ct.title,
    artist: ct.artist,
    thumbnail: ct.thumbnail,
    durationMs: 0,
  };
}

// ─── 차트 탭 콘텐츠 (페이지네이션) ──────────────────────

interface ChartTabContentProps {
  category: ShowcaseCategory;
  onSelectTrack: (track: SearchResultItem) => void;
  selectedIds: Set<string>;
  selectedOrder: string[];
  disabledIds: Set<string>;
  maxReached: boolean;
  favoriteIds?: Set<string>;
  favLoadingIds?: Set<string>;
  onToggleFavorite?: (track: SearchResultItem) => void;
  isGuest?: boolean;
}

function ChartTabContent({
  category,
  onSelectTrack,
  selectedIds,
  selectedOrder,
  disabledIds,
  maxReached,
  favoriteIds,
  favLoadingIds,
  onToggleFavorite,
  isGuest,
}: ChartTabContentProps) {
  const [tracks, setTracks] = useState<SearchResultItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  const playlistId = category.tracks[0]?.playlistId;

  // page 1 = DB 캐시, page 2+ = playlist API
  useEffect(() => {
    if (page === 1) {
      setTracks(category.tracks.map(chartTrackToSearchItem));
      setTotal(category.tracks.length >= limit ? limit * 5 : category.tracks.length); // 추정 (첫 fetch에서 갱신)
      return;
    }
    if (!playlistId) return;
    setLoading(true);
    fetch(`/api/search/playlist/${playlistId}?page=${page}&limit=${limit}`)
      .then((res) => res.json())
      .then((data: { tracks: SearchResultItem[]; total: number }) => {
        setTracks(data.tracks);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [page, playlistId, category.tracks, limit]);

  // 탭 전환 시 리셋
  useEffect(() => {
    setPage(1);
  }, [playlistId]);

  const totalPages = Math.ceil(total / limit);
  const topItems = page === 1 ? tracks.slice(0, 5) : [];
  const listItems = page === 1 ? tracks.slice(5) : tracks;

  if (loading) return <GridSkeleton />;

  return (
    <div className="space-y-3">
      {topItems.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {topItems.map((item, rank) => {
            const selected = selectedIds.has(item.sourceId);
            const disabled = disabledIds.has(item.sourceId) || (maxReached && !selected);
            return (
              <button
                key={`${item.sourceId}_${rank}`}
                type="button"
                disabled={disabled}
                onClick={() => onSelectTrack(item)}
                className={cn(
                  'flex flex-col gap-1.5 rounded-xl border p-1.5 text-left transition-colors touch-manipulation',
                  selected ? 'border-sa-accent/50 bg-sa-accent/10' : 'border-white/5 bg-white/[0.03]',
                  disabled && 'opacity-40',
                )}
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                  <Thumbnail src={item.thumbnail} size="md" className="h-full w-full rounded-lg" />
                  <span className="absolute left-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-[10px] font-bold text-white/80">
                    {rank + 1}
                  </span>
                  {selected && (
                    <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-sa-accent text-[10px] font-bold text-white shadow">
                      {selectedOrder.indexOf(item.sourceId) + 1}
                    </span>
                  )}
                </div>
                <div className="min-w-0 px-0.5">
                  <p className="line-clamp-1 text-[11px] font-medium text-white">{item.name}</p>
                  <p className="truncate text-[10px] text-sa-text-muted">{item.artist}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {listItems.length > 0 && (
        <div className="space-y-1">
          {listItems.map((item, idx) => (
            <SearchTrackItem
              key={`${item.sourceId}_${idx}`}
              track={item}
              order={selectedOrder.indexOf(item.sourceId) + 1}
              disabled={disabledIds.has(item.sourceId) || (maxReached && !selectedIds.has(item.sourceId))}
              full={maxReached && !selectedIds.has(item.sourceId)}
              inQueue={disabledIds.has(item.sourceId)}
              onClick={() => onSelectTrack(item)}
              isFavorite={favoriteIds?.has(item.sourceId)}
              favLoading={favLoadingIds?.has(item.sourceId)}
              onToggleFavorite={() => onToggleFavorite?.(item)}
              isGuest={isGuest}
            />
          ))}
        </div>
      )}
      <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

interface TabItem {
  key: string;
  label: string;
  emoji: string;
  disabled?: boolean;
}

interface UnifiedShowcaseProps {
  tabs: TabItem[];
  defaultTab: string;
  categories: ShowcaseCategory[];
  popular: SearchResultItem[];
  myHistory: SearchResultItem[];
  recent: SearchResultItem[];
  recommended: SearchResultItem[];
  recFetching: boolean;
  recRefetch: () => void;
  showcaseLoading: boolean;
  recLoading: boolean;
  onSelectTrack: (track: SearchResultItem) => void;
  selectedIds: Set<string>;
  selectedOrder: string[];
  disabledIds: Set<string>;
  maxReached: boolean;
  favoriteIds?: Set<string>;
  favLoadingIds?: Set<string>;
  onToggleFavorite?: (track: SearchResultItem) => void;
  isGuest?: boolean;
  grid: (tracks: SearchResultItem[]) => ReactNode;
}

function UnifiedShowcase({
  tabs,
  defaultTab,
  categories,
  popular,
  myHistory,
  recent,
  recommended,
  recFetching,
  recRefetch,
  showcaseLoading,
  recLoading,
  onSelectTrack,
  selectedIds,
  selectedOrder,
  disabledIds,
  maxReached,
  favoriteIds,
  favLoadingIds,
  onToggleFavorite,
  isGuest,
  grid,
}: UnifiedShowcaseProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  // 탭이 변경되면 유효한 탭으로 보정
  const currentTab = tabs.find((t) => t.key === activeTab) ? activeTab : (tabs[0]?.key ?? '');

  const handleTabClick = (key: string) => {
    if (key === currentTab) {
      if (key === '_recommended') recRefetch();
      return;
    }
    setActiveTab(key);
  };

  const renderContent = () => {
    // 로딩 상태
    if (
      showcaseLoading &&
      ((currentTab.startsWith('_') && currentTab !== '_recommended') || currentTab.startsWith('chart_'))
    ) {
      return <GridSkeleton />;
    }
    if (recLoading && currentTab === '_recommended') return <GridSkeleton />;

    // 차트 카테고리
    if (currentTab.startsWith('chart_')) {
      const idx = parseInt(currentTab.split('_')[1]);
      const cat = categories[idx];
      if (!cat) return null;
      return (
        <ChartTabContent
          category={cat}
          onSelectTrack={onSelectTrack}
          selectedIds={selectedIds}
          selectedOrder={selectedOrder}
          disabledIds={disabledIds}
          maxReached={maxReached}
          favoriteIds={favoriteIds}
          favLoadingIds={favLoadingIds}
          onToggleFavorite={onToggleFavorite}
          isGuest={isGuest}
        />
      );
    }

    // 고정 탭
    switch (currentTab) {
      case '_popular':
        return grid(popular);
      case '_myHistory':
        return grid(myHistory);
      case '_recent':
        return grid(recent);
      case '_recommended':
        return grid(recommended);
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* 통합 칩 바 + 보기방식 */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/5 pt-1 pb-2">
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {tabs.map((tab) => {
            const loading =
              ((tab.key === '_popular' || tab.key === '_myHistory' || tab.key === '_recent') && showcaseLoading) ||
              (tab.key === '_recommended' && recLoading) ||
              (tab.key.startsWith('chart_') && showcaseLoading);
            return (
              <button
                key={tab.key}
                type="button"
                disabled={tab.disabled}
                onClick={() => handleTabClick(tab.key)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors touch-manipulation',
                  tab.disabled
                    ? 'cursor-default bg-white/[0.02] text-white/25'
                    : currentTab === tab.key
                      ? 'bg-sa-accent/20 text-sa-accent ring-1 ring-sa-accent/40'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80',
                )}
              >
                {loading ? <Loader2 size={10} className="animate-spin" /> : <span>{tab.emoji}</span>}
                {tab.label}
              </button>
            );
          })}
        </div>
        <ViewModeToggle />
      </div>

      {/* 콘텐츠 — 스크롤 */}
      <div className="min-h-0 flex-1 overflow-y-auto">{renderContent()}</div>
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
  favLoadingIds,
  onToggleFavorite,
  isGuest,
}: SearchShowcaseProps) {
  const t = useTranslations('search');
  const { data: showcaseData, isLoading: showcaseLoading } = useSearchControllerGetShowcase(roomId);
  const {
    data: recData,
    isLoading: recLoading,
    isFetching: recFetching,
    refetch: recRefetch,
  } = useSearchControllerGetRecommended(roomId);
  const {
    data: radioData,
    isLoading: radioLoading,
    isFetching: radioFetching,
    refetch: radioRefetch,
  } = useSearchControllerGetRadio(roomId);

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

  const viewMode = usePreferencesStore((s) => s.viewMode);

  const grid = (tracks: SearchResultItem[]) =>
    viewMode === 'list' ? (
      <div className="space-y-1">
        {tracks.map((t) => (
          <SearchTrackItem
            key={t.sourceId}
            track={t}
            order={selectedOrder.indexOf(t.sourceId) + 1}
            disabled={disabledIds.has(t.sourceId) || (maxReached && !selectedIds.has(t.sourceId))}
            full={maxReached && !selectedIds.has(t.sourceId)}
            inQueue={disabledIds.has(t.sourceId)}
            onClick={() => handleClick(t)}
            isFavorite={favoriteIds?.has(t.sourceId)}
            favLoading={favLoadingIds?.has(t.sourceId)}
            onToggleFavorite={() => onToggleFavorite?.(t)}
            isGuest={isGuest}
          />
        ))}
      </div>
    ) : (
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
            favLoading={favLoadingIds?.has(t.sourceId)}
            onToggleFavorite={() => onToggleFavorite?.(t)}
            isGuest={isGuest}
          />
        ))}
      </div>
    );

  const { popular = [], recent = [], myHistory = [] } = showcaseData ?? {};
  const categories: ShowcaseCategory[] = showcaseData?.categories ?? [];
  const recommended = recData?.recommended ?? [];
  const radio = radioData?.radio ?? [];
  // 추천 + 라디오를 하나로 통합 (중복 sourceId 제거)
  const combined = [...recommended, ...radio.filter((r) => !recommended.some((rec) => rec.sourceId === r.sourceId))];
  const allEmpty =
    !showcaseLoading &&
    !recLoading &&
    !radioLoading &&
    !popular.length &&
    !recent.length &&
    !myHistory.length &&
    !combined.length &&
    !categories.length;

  if (allEmpty) {
    return (
      <div className="py-16 text-center">
        <Music size={32} className="mx-auto mb-3 text-white/10" />
        <p className="text-sm text-sa-text-muted">{t('showcase.emptyTitle')}</p>
        <p className="mt-1 text-xs text-sa-text-muted">{t('showcase.emptyHint')}</p>
      </div>
    );
  }

  // 통합 탭 구성: 차트 카테고리 + 기존 고정 탭
  const fixedTabs: TabItem[] = [
    { key: '_popular', label: t('showcase.popular'), emoji: '🔥', disabled: !popular.length },
    { key: '_myHistory', label: t('showcase.myHistory'), emoji: '🎵', disabled: !myHistory.length },
    { key: '_recent', label: t('showcase.recentPlays'), emoji: '⏱', disabled: !recent.length },
    { key: '_recommended', label: t('showcase.recommended'), emoji: '💡', disabled: !combined.length },
  ];

  const chartTabs: TabItem[] = categories.map((cat, idx) => ({
    key: `chart_${idx}`,
    label: cat.label,
    emoji: cat.emoji,
    disabled: !cat.tracks.length,
  }));

  // 활성 탭 먼저, 비활성 탭 뒤로
  const enabledChart = chartTabs.filter((t) => !t.disabled);
  const disabledChart = chartTabs.filter((t) => t.disabled);
  const enabledFixed = fixedTabs.filter((t) => !t.disabled);
  const disabledFixed = fixedTabs.filter((t) => t.disabled);
  const allTabs = [...enabledChart, ...enabledFixed, ...disabledChart, ...disabledFixed];
  const defaultTab = allTabs.find((t) => !t.disabled)?.key ?? '';

  return (
    <UnifiedShowcase
      tabs={allTabs}
      defaultTab={defaultTab}
      categories={categories}
      popular={popular.map(toSearchItem)}
      myHistory={myHistory.map(toSearchItem)}
      recent={recent.map(toSearchItem)}
      recommended={combined}
      recFetching={recFetching || radioFetching}
      recRefetch={() => {
        recRefetch();
        radioRefetch();
      }}
      showcaseLoading={showcaseLoading}
      recLoading={recLoading || radioLoading}
      onSelectTrack={handleClick}
      selectedIds={selectedIds}
      selectedOrder={selectedOrder}
      disabledIds={disabledIds}
      maxReached={maxReached}
      favoriteIds={favoriteIds}
      favLoadingIds={favLoadingIds}
      onToggleFavorite={onToggleFavorite}
      isGuest={isGuest}
      grid={grid}
    />
  );
}
