import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import { AiDjSettings } from '@/components/admin/AiDjSettings';

const meta: Meta = {
  title: 'Features/Admin/AiDj',
};
export default meta;

export const Settings: StoryObj = {
  render: () => {
    const [draft, setDraft] = useState<Record<string, string>>({
      'autodj.aiEnabled': 'true',
      'autodj.aiModel': 'gemini-2.5-flash-lite',
      'autodj.batchSize': '15',
      'autodj.temperature': '0.8',
    });
    const set = (key: string, value: string) => setDraft((d) => ({ ...d, [key]: value }));
    return (
      <div className="w-96 rounded-xl bg-black/90 p-4">
        <AiDjSettings draft={draft} set={set} hasGemini />
      </div>
    );
  },
};

export const SettingsNoKey: StoryObj = {
  render: () => {
    const [draft, setDraft] = useState<Record<string, string>>({});
    const set = (key: string, value: string) => setDraft((d) => ({ ...d, [key]: value }));
    return (
      <div className="w-96 rounded-xl bg-black/90 p-4">
        <AiDjSettings draft={draft} set={set} hasGemini={false} />
      </div>
    );
  },
};
