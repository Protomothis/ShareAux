import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import Thumbnail from '@/components/common/Thumbnail';

const meta: Meta<typeof Thumbnail> = {
  title: 'Primitives/Thumbnail',
  component: Thumbnail,
  decorators: [
    (Story) => (
      <div className="flex gap-4 items-end">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Thumbnail>;

const ytSrc = 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg';

export const Small: Story = { args: { src: ytSrc, size: 'sm', className: 'h-10 w-10 rounded-lg' } };
export const Medium: Story = { args: { src: ytSrc, size: 'md', className: 'h-24 w-40 rounded-xl' } };
export const Large: Story = { args: { src: ytSrc, size: 'lg', className: 'h-40 w-60 rounded-2xl' } };
export const NoImage: Story = { args: { src: null, className: 'h-24 w-40 rounded-xl' } };

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Thumbnail src={ytSrc} size="sm" className="h-10 w-10 rounded-lg" />
      <Thumbnail src={ytSrc} size="md" className="h-24 w-40 rounded-xl" />
      <Thumbnail src={ytSrc} size="lg" className="h-40 w-60 rounded-2xl" />
      <Thumbnail src={null} className="h-24 w-40 rounded-xl" />
    </div>
  ),
};
