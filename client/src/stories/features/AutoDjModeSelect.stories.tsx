import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import type { AutoDjMode } from '@/components/queue/AutoDjModeSelect';
import { AutoDjModeSelect } from '@/components/queue/AutoDjModeSelect';

const meta: Meta<typeof AutoDjModeSelect> = {
  title: 'Features/AutoDjModeSelect',
  component: AutoDjModeSelect,
};
export default meta;
type Story = StoryObj<typeof AutoDjModeSelect>;

export const Default: Story = {
  render: () => {
    const [mode, setMode] = useState<AutoDjMode>('related');
    return <AutoDjModeSelect value={mode} onChange={setMode} />;
  },
};

export const AiDisabled: Story = {
  render: () => {
    const [mode, setMode] = useState<AutoDjMode>('mixed');
    return <AutoDjModeSelect value={mode} onChange={setMode} aiDisabled />;
  },
};

export const AiSelected: Story = {
  render: () => {
    const [mode, setMode] = useState<AutoDjMode>('ai');
    return <AutoDjModeSelect value={mode} onChange={setMode} />;
  },
};
