import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import DJPanel from '@/components/player/DJPanel';

const mockTrack = {
  id: 'mock-track',
  name: 'Blinding Lights',
  artist: 'The Weeknd',
  thumbnail: 'https://picsum.photos/200',
  durationMs: 200000,
};

const meta: Meta<typeof DJPanel> = {
  title: 'Features/DJPanel',
  component: DJPanel,
  args: { roomId: 'r1' },
  decorators: [
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof DJPanel>;

export const WithTrack: Story = {
  args: { track: mockTrack, hasNext: true, hasPrev: true },
};

export const NoTrack: Story = {
  args: { track: null, hasNext: false, hasPrev: false },
};

export const NoNavigation: Story = {
  args: { track: mockTrack, hasNext: false, hasPrev: false },
};
