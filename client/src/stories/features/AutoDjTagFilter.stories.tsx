import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import type { AutoDjTags } from '@/components/queue/AutoDjTagFilter';
import { AutoDjTagFilter } from '@/components/queue/AutoDjTagFilter';

const meta: Meta<typeof AutoDjTagFilter> = {
  title: 'Features/AutoDjTagFilter',
  component: AutoDjTagFilter,
};
export default meta;
type Story = StoryObj<typeof AutoDjTagFilter>;

export const Empty: Story = {
  render: () => {
    const [tags, setTags] = useState<AutoDjTags>({ mood: [], genre: [], era: [], country: [] });
    return (
      <div className="w-80 rounded-xl bg-black/90 p-4">
        <AutoDjTagFilter value={tags} onChange={setTags} />
      </div>
    );
  },
};

export const Prefilled: Story = {
  render: () => {
    const [tags, setTags] = useState<AutoDjTags>({
      mood: ['calm', 'emotional'],
      genre: ['indie'],
      era: ['2010s'],
      country: ['jp'],
    });
    return (
      <div className="w-80 rounded-xl bg-black/90 p-4">
        <AutoDjTagFilter value={tags} onChange={setTags} />
      </div>
    );
  },
};
