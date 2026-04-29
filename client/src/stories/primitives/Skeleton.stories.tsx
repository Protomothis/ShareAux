import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SkeletonLine, SkeletonCard, SkeletonCircle } from '@/components/ui/skeleton';

export default { title: 'Primitives/Skeleton' } satisfies Meta;

export const Lines: StoryObj = {
  render: () => (
    <div className="max-w-xs space-y-2">
      <SkeletonLine className="w-3/4" />
      <SkeletonLine className="w-1/2" />
      <SkeletonLine className="w-full" />
    </div>
  ),
};

export const Cards: StoryObj = {
  render: () => (
    <div className="grid grid-cols-2 gap-3">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  ),
};

export const Circles: StoryObj = {
  render: () => (
    <div className="flex gap-2">
      <SkeletonCircle />
      <SkeletonCircle className="h-8 w-8" />
      <SkeletonCircle className="h-6 w-6" />
    </div>
  ),
};

export const ListItem: StoryObj = {
  render: () => (
    <div className="flex items-center gap-3">
      <SkeletonCircle className="h-10 w-10 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <SkeletonLine className="w-2/3" />
        <SkeletonLine className="w-1/3" />
      </div>
    </div>
  ),
};
