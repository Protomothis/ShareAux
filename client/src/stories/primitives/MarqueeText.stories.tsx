import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import MarqueeText from '@/components/common/MarqueeText';

const meta: Meta<typeof MarqueeText> = {
  title: 'Primitives/MarqueeText',
  component: MarqueeText,
  args: { text: 'ShareAux', className: 'text-sm text-white' },
};
export default meta;
type Story = StoryObj<typeof MarqueeText>;

export const ShortText: Story = {
  args: { text: 'Short Title' },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const LongText: Story = {
  args: { text: 'This Is A Very Long Song Title That Should Definitely Overflow And Start Scrolling' },
  decorators: [
    (Story) => (
      <div className="w-48">
        <Story />
      </div>
    ),
  ],
};

export const InPlayer: Story = {
  args: {
    text: 'Blinding Lights — The Weeknd (Official Music Video)',
    className: 'text-[15px] font-semibold text-white leading-tight',
  },
  decorators: [
    (Story) => (
      <div className="w-56">
        <Story />
      </div>
    ),
  ],
};
