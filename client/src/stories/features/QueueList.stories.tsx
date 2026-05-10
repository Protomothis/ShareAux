import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import type { RoomQueue } from '@/api/model';
import QueueTrackItem from '@/components/queue/QueueTrackItem';

const tracks = [
  { sourceId: 'TW9d8vYrVFQ', name: 'Elektronomia — Sky High', artist: 'Elektronomia', thumbnail: 'https://i.ytimg.com/vi/TW9d8vYrVFQ/mqdefault.jpg', durationMs: 283000 },
  { sourceId: 'J2X5mJ3HDYE', name: 'DEAF KEV — Invincible', artist: 'DEAF KEV', thumbnail: 'https://i.ytimg.com/vi/J2X5mJ3HDYE/mqdefault.jpg', durationMs: 253000 },
  { sourceId: 'K4DyBUG242c', name: 'Cartoon — On & On', artist: 'Cartoon ft. Daniel Levi', thumbnail: 'https://i.ytimg.com/vi/K4DyBUG242c/mqdefault.jpg', durationMs: 208000 },
  { sourceId: '__CRWE-L45k', name: 'Tobu — Candyland', artist: 'Tobu', thumbnail: 'https://i.ytimg.com/vi/__CRWE-L45k/mqdefault.jpg', durationMs: 219000 },
];

const mockItems: RoomQueue[] = tracks.map((t, i) => ({
  id: `q${i}`,
  room: {} as RoomQueue['room'],
  track: { id: `t${i}`, provider: 'yt', ...t } as RoomQueue['track'],
  addedBy: { id: `u${i}`, nickname: ['Alex', 'Mina', 'Jay', 'Sora'][i] } as RoomQueue['addedBy'],
  position: i + 1,
  played: false,
  isAutoDj: false,
  addedAt: new Date().toISOString(),
  version: 1,
}));

function QueueList() {
  return (
    <div className="w-[360px] bg-sa-bg-primary rounded-xl p-3 space-y-1">
      <div className="text-sm font-semibold text-sa-text-primary px-2 pb-2">신청곡 (4)</div>
      {mockItems.map((item) => (
        <QueueTrackItem key={item.id} item={item} />
      ))}
    </div>
  );
}

const meta: Meta = {
  title: 'Features/Queue/QueueList',
  component: QueueList,
  parameters: { layout: 'centered', backgrounds: { default: 'dark' } },
};
export default meta;

type Story = StoryObj;
export const Default: Story = {};
