import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import Chat from '@/components/chat/Chat';

const now = new Date().toISOString();

const mockMessages = [
  { userId: '1', nickname: 'DJ_Kim', message: 'user_joined', timestamp: now, type: 'system' as const },
  { userId: '2', nickname: 'MusicLover', message: '이 노래 좋다!', timestamp: now },
  { userId: '3', nickname: 'PartyPeople', message: '🔥🔥🔥', timestamp: now },
  { userId: '1', nickname: 'DJ_Kim', message: '다음 곡 뭐 들을까요?', timestamp: now },
  { userId: '2', nickname: 'MusicLover', message: 'Blinding Lights 넣어주세요!', timestamp: now },
  { userId: '3', nickname: '', message: 'track_changed', timestamp: now, type: 'system' as const },
];

const meta: Meta<typeof Chat> = {
  title: 'Features/Chat',
  component: Chat,
  args: { onSend: fn(), onReaction: fn() },
  decorators: [
    (Story) => (
      <div className="h-96 rounded-2xl border border-white/10 bg-white/5">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Chat>;

export const Empty: Story = {
  args: { messages: [] },
};

export const WithMessages: Story = {
  args: { messages: mockMessages },
};

export const WithReactions: Story = {
  args: {
    messages: mockMessages.slice(0, 3),
    floatingReactions: [
      { id: 1, x: 30, y: 50, emoji: '❤️' },
      { id: 2, x: 60, y: 40, emoji: '🔥' },
    ],
  },
};
