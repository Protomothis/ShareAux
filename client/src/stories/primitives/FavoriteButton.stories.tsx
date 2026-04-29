import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FavoriteButton } from '@/components/common/FavoriteButton';

const meta: Meta<typeof FavoriteButton> = {
  title: 'Primitives/FavoriteButton',
  component: FavoriteButton,
  args: { onClick: fn() },
};
export default meta;
type Story = StoryObj<typeof FavoriteButton>;

export const Inactive: Story = { args: { active: false } };
export const Active: Story = { args: { active: true } };
export const Loading: Story = { args: { active: false, loading: true } };
export const Large: Story = { args: { active: true, size: 20 } };

export const AllStates: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <FavoriteButton active={false} onClick={fn()} />
      <FavoriteButton active={true} onClick={fn()} />
      <FavoriteButton active={false} loading onClick={fn()} />
      <FavoriteButton active={true} size={20} onClick={fn()} />
    </div>
  ),
};
