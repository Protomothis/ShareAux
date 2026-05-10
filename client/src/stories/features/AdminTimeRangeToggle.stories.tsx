import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import { TimeRangeToggle } from '@/components/admin/charts/TimeRangeToggle';
import type { TimeRange } from '@/hooks/admin/useAdminMetrics';

const meta: Meta<typeof TimeRangeToggle> = {
  title: 'Features/Admin/Charts/TimeRangeToggle',
  component: TimeRangeToggle,
};
export default meta;
type Story = StoryObj<typeof TimeRangeToggle>;

export const Default: Story = {
  render: () => {
    const [range, setRange] = useState<TimeRange>('1h');
    return <TimeRangeToggle value={range} onChange={setRange} />;
  },
};
