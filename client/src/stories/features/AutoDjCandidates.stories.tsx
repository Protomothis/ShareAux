import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import type { CandidateTrack } from '@/components/queue/AutoDjCandidates';
import { AutoDjCandidates } from '@/components/queue/AutoDjCandidates';

const meta: Meta<typeof AutoDjCandidates> = {
  title: 'Features/AutoDJ/Candidates',
  component: AutoDjCandidates,
};
export default meta;
type Story = StoryObj<typeof AutoDjCandidates>;

const mockCandidates: CandidateTrack[] = [
  { id: '1', name: 'Creep', artist: 'Radiohead', thumbnail: null },
  { id: '2', name: 'There Is a Light That Never Goes Out', artist: 'The Smiths', thumbnail: null },
  { id: '3', name: 'Suzanne', artist: 'Leonard Cohen', thumbnail: null, pinned: true },
];

export const Default: Story = {
  args: {
    candidates: mockCandidates,
    onPin: fn(),
    onSkip: fn(),
  },
};

export const Interactive: Story = {
  render: () => {
    const [candidates, setCandidates] = useState(mockCandidates);
    return (
      <div className="w-80 rounded-xl bg-black/90 p-4">
        <AutoDjCandidates
          candidates={candidates}
          onPin={(id) => setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)))}
          onSkip={(id) => setCandidates((prev) => prev.filter((c) => c.id !== id))}
          onEnqueue={(id) => setCandidates((prev) => prev.filter((c) => c.id !== id))}
        />
      </div>
    );
  },
};
