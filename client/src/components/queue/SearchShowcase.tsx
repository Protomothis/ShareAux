'use client';

import { Loader2, Music, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
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
import { SkeletonLine } from '@/components/ui/skeleton';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import { usePreferencesStore } from '@/stores/preferences';

import { SearchTrackItem } from './SearchTrackItem';

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

interface TabItem {
  key: string;
  label: string;
  emoji: string;
}

interface UnifiedShowcaseProps {
  tabs: TabItem[];
  defaultTab: string;
  categories: ShowcaseCategory[];
  popular: SearchResultItem[];
  myHistory: SearchResultItem[];
  recent: SearchResultItem[];
  recommended: SearchResultItem[];
  radio: SearchResultItem[];
  recFetching: boolean;
  radioFetching: boolean;
  recRefetch: () => void;
  radioRefetch: () => void;
  showcaseLoading: boolean;
  recLoading: boolean;
  radioLoading: boolean;
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
  radio,
  recFetching,
  radioFetching,
  recRefetch,
  radioRefetch,
  showcaseLoading,
  recLoading,
  radioLoading,
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

  const renderContent = () => {
    // 로딩 상태
    if (showcaseLoading && currentTab.startsWith('_') && !['_recommended', '_radio'].includes(currentTab)) {
      return <GridSkeleton />;
    }
    if (recLoading && currentTab === '_recommended') return <GridSkeleton />;
    if (radioLoading && currentTab === '_radio') return <GridSkeleton />;

    // 차트 카테고리
    if (currentTab.startsWith('chart_')) {
      const idx = parseInt(currentTab.split('_')[1]);
      const cat = categories[idx];
      if (!cat) return null;
      const topTracks = cat.tracks.slice(0, 5);
      const restTracks = cat.tracks.slice(5);
      return (
        <div className="space-y-3">
          {topTracks.length > 0 && (
            <div className="-mx-4 overflow-x-auto px-4 scrollbar-hide">
              <div className="flex gap-2" style={{ width: 'max-content' }}>
                {topTracks.map((ct, rank) => {
                  const item = chartTrackToSearchItem(ct);
                  const selected = selectedIds.has(item.sourceId);
                  const disabled = disabledIds.has(item.sourceId) || (maxReached && !selected);
                  return (
                    <button
                      key={ct.sourceId}
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelectTrack(item)}
                      className={cn(
                        'flex w-[120px] shrink-0 flex-col gap-1.5 rounded-xl border p-1.5 text-left transition-colors touch-manipulation',
                        selected ? 'border-sa-accent/50 bg-sa-accent/10' : 'border-white/5 bg-white/[0.03]',
                        disabled && 'opacity-40',
                      )}
                    >
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                        <Thumbnail src={ct.thumbnail} size="md" className="h-full w-full rounded-lg" />
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
                        <p className="line-clamp-1 text-[11px] font-medium text-white">{ct.title}</p>
                        <p className="truncate text-[10px] text-sa-text-muted">{ct.artist}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {restTracks.length > 0 && (
            <div className="space-y-1">
              {restTracks.map((ct) => {
                const item = chartTrackToSearchItem(ct);
                return (
                  <SearchTrackItem
                    key={ct.sourceId}
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
                );
              })}
            </div>
          )}
        </div>
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
        return (
          <div className="space-y-2">
            <div className="flex justify-end px-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => recRefetch()}
                className="text-sa-text-muted hover:text-white"
              >
                {recFetching ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              </Button>
            </div>
            {grid(recommended)}
          </div>
        );
      case '_radio':
        return (
          <div className="space-y-2">
            <div className="flex justify-end px-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => radioRefetch()}
                className="text-sa-text-muted hover:text-white"
              >
                {radioFetching ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              </Button>
            </div>
            {grid(radio)}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* 통합 칩 바 */}
      <div className="-mx-4 overflow-x-auto px-4 py-0.5 scrollbar-hide">
        <div className="flex gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors touch-manipulation',
                currentTab === tab.key
                  ? 'bg-sa-accent/20 text-sa-accent ring-1 ring-sa-accent/40'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80',
              )}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 콘텐츠 */}
      {renderContent()}
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
  const allEmpty =
    !showcaseLoading &&
    !recLoading &&
    !radioLoading &&
    !popular.length &&
    !recent.length &&
    !myHistory.length &&
    !recommended.length &&
    !radio.length &&
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
  interface TabItem {
    key: string;
    label: string;
    emoji: string;
  }

  const fixedTabs: TabItem[] = [];
  if (popular.length) fixedTabs.push({ key: '_popular', label: t('showcase.popular'), emoji: '🔥' });
  if (myHistory.length) fixedTabs.push({ key: '_myHistory', label: t('showcase.myHistory'), emoji: '🎵' });
  if (recent.length) fixedTabs.push({ key: '_recent', label: t('showcase.recentPlays'), emoji: '⏱' });
  if (recommended.length) fixedTabs.push({ key: '_recommended', label: t('showcase.recommended'), emoji: '💡' });
  if (radio.length) fixedTabs.push({ key: '_radio', label: t('showcase.radio'), emoji: '📻' });

  const chartTabs: TabItem[] = categories.map((cat, idx) => ({
    key: `chart_${idx}`,
    label: cat.label,
    emoji: cat.emoji,
  }));

  const allTabs = [...chartTabs, ...fixedTabs];
  const defaultTab = allTabs[0]?.key ?? '';

  return (
    <UnifiedShowcase
      tabs={allTabs}
      defaultTab={defaultTab}
      categories={categories}
      popular={popular.map(toSearchItem)}
      myHistory={myHistory.map(toSearchItem)}
      recent={recent.map(toSearchItem)}
      recommended={recommended}
      radio={radio}
      recFetching={recFetching}
      radioFetching={radioFetching}
      recRefetch={recRefetch}
      radioRefetch={radioRefetch}
      showcaseLoading={showcaseLoading}
      recLoading={recLoading}
      radioLoading={radioLoading}
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
