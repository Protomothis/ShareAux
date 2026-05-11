import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import type { CandidateTrack } from '@/components/queue/AutoDjCandidates';
import type { AutoDjMode } from '@/components/queue/AutoDjModeSelect';
import { AutoDjTab } from '@/components/queue/AutoDjTab';
import type { AutoDjTags } from '@/components/queue/AutoDjTagFilter';

const meta: Meta<typeof AutoDjTab> = {
  title: 'Features/AutoDJ/Tab',
  component: AutoDjTab,
};
export default meta;
type Story = StoryObj<typeof AutoDjTab>;

const mockCandidates: CandidateTrack[] = [
  { id: '1', name: 'Creep', artist: 'Radiohead', thumbnail: null },
  { id: '2', name: 'Karma Police', artist: 'Radiohead', thumbnail: null, pinned: true },
  { id: '3', name: 'No Surprises', artist: 'Radiohead', thumbnail: null },
];

const emptyTags: AutoDjTags = { mood: [], genre: [], era: [], country: [] };

export const RelatedMode: Story = {
  render: () => {
    const [mode, setMode] = useState<AutoDjMode>('related');
    const [paused, setPaused] = useState(false);
    const [candidates, setCandidates] = useState(mockCandidates);
    return (
      <div className="w-96 rounded-xl bg-black/90 p-4">
        <AutoDjTab
          mode={mode}
          onModeChange={setMode}
          paused={paused}
          onTogglePause={() => setPaused(!paused)}
          savedTags={emptyTags}
          onApply={fn()}
          candidates={candidates}
          onPin={(id) => setCandidates((p) => p.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)))}
          onSkip={(id) => setCandidates((p) => p.filter((c) => c.id !== id))}
          onEnqueue={(id) => setCandidates((p) => p.filter((c) => c.id !== id))}
          onRefresh={fn()}
        />
      </div>
    );
  },
};

export const AiMode: Story = {
  render: () => {
    const [mode, setMode] = useState<AutoDjMode>('ai');
    const [paused, setPaused] = useState(false);
    const savedTags: AutoDjTags = { mood: ['calm'], genre: ['indie'], era: ['2010s'], country: ['jp'] };
    const [candidates, setCandidates] = useState(mockCandidates);
    return (
      <div className="w-96 rounded-xl bg-black/90 p-4">
        <AutoDjTab
          mode={mode}
          onModeChange={setMode}
          paused={paused}
          onTogglePause={() => setPaused(!paused)}
          savedTags={savedTags}
          onApply={fn()}
          candidates={candidates}
          onPin={(id) => setCandidates((p) => p.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)))}
          onSkip={(id) => setCandidates((p) => p.filter((c) => c.id !== id))}
          onEnqueue={(id) => setCandidates((p) => p.filter((c) => c.id !== id))}
          onRefresh={fn()}
        />
      </div>
    );
  },
};

export const AiDisabled: Story = {
  render: () => {
    const [mode, setMode] = useState<AutoDjMode>('mixed');
    const [paused, setPaused] = useState(false);
    return (
      <div className="w-96 rounded-xl bg-black/90 p-4">
        <AutoDjTab
          mode={mode}
          onModeChange={setMode}
          paused={paused}
          onTogglePause={() => setPaused(!paused)}
          savedTags={emptyTags}
          onApply={fn()}
          candidates={[]}
          onPin={fn()}
          onSkip={fn()}
          onEnqueue={fn()}
          aiDisabled
        />
      </div>
    );
  },
};
