'use client';

import { useQueueControllerGetHistory } from '@/api/queue/queue';
import EmptyState from '@/components/common/EmptyState';

import QueueTrackItem from './QueueTrackItem';

interface HistoryPanelProps {
  roomId: string;
}

export default function HistoryPanel({ roomId }: HistoryPanelProps) {
  const { data: history = [] } = useQueueControllerGetHistory(roomId);

  if (history.length === 0) {
    return <EmptyState icon="📻" title="아직 재생된 곡이 없습니다" description="곡이 재생되면 여기에 기록됩니다" />;
  }

  return (
    <div className="h-full overflow-y-auto">
      {history.map((item) => (
        <QueueTrackItem key={item.id} item={item} className="opacity-60 hover:opacity-80" />
      ))}
    </div>
  );
}
