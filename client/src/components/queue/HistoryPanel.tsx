'use client';

import { useQueueControllerGetHistory } from '@/api/queue/queue';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import EmptyState from '@/components/common/EmptyState';
import type { FavoriteActions } from '@/types';

import QueueTrackItem from './QueueTrackItem';
import TrackVoteButtons from './TrackVoteButtons';

interface HistoryPanelProps {
  roomId: string;
  isGuest?: boolean;
  favorites: FavoriteActions;
}

export default function HistoryPanel({ roomId, isGuest, favorites }: HistoryPanelProps) {
  const { data: history = [] } = useQueueControllerGetHistory(roomId);
  const { favoriteIds, favLoadingIds, toggleFavorite } = favorites;

  if (history.length === 0) {
    return <EmptyState icon="📻" title="아직 재생된 곡이 없습니다" description="곡이 재생되면 여기에 기록됩니다" />;
  }

  return (
    <div className="h-full overflow-y-auto">
      {history.map((item) => (
        <QueueTrackItem
          key={item.id}
          item={item}
          className="opacity-60 hover:opacity-80"
          favoriteSlot={
            !isGuest ? (
              <FavoriteButton
                active={favoriteIds.has(item.track.sourceId)}
                loading={favLoadingIds.has(item.track.sourceId)}
                onClick={() =>
                  toggleFavorite({
                    provider: item.track.provider as unknown as import('@/api/model').SearchResultItem['provider'],
                    sourceId: item.track.sourceId,
                    name: item.track.name,
                    artist: item.track.artist ?? null,
                    thumbnail: item.track.thumbnail ?? null,
                    durationMs: item.track.durationMs,
                  })
                }
              />
            ) : undefined
          }
          actions={<TrackVoteButtons trackId={item.track.id} roomId={roomId} />}
        />
      ))}
    </div>
  );
}
