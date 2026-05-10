import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';

import { AiDjSettings } from '@/components/admin/AiDjSettings';
import type { TagPreset } from '@/components/admin/TagPresetManager';
import { TagPresetManager } from '@/components/admin/TagPresetManager';

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

const defaultMood: TagPreset[] = [
  { id: '1', label: '잔잔한', value: 'calm' },
  { id: '2', label: '신나는', value: 'upbeat' },
  { id: '3', label: '감성적', value: 'emotional' },
];
const defaultGenre: TagPreset[] = [
  { id: '4', label: '인디', value: 'indie' },
  { id: '5', label: '팝', value: 'pop' },
];
const defaultEra: TagPreset[] = [
  { id: '6', label: '최신', value: 'latest' },
  { id: '7', label: '2010s', value: '2010s' },
];
const defaultCountry: TagPreset[] = [
  { id: '8', label: '한국', value: 'kr', icon: '🇰🇷' },
  { id: '9', label: '일본', value: 'jp', icon: '🇯🇵' },
];

export const TagPresets: StoryObj = {
  render: () => {
    const [mood, setMood] = useState(defaultMood);
    const [genre, setGenre] = useState(defaultGenre);
    const [era, setEra] = useState(defaultEra);
    const [country, setCountry] = useState(defaultCountry);
    return (
      <div className="w-96 rounded-xl bg-black/90 p-4">
        <TagPresetManager
          mood={mood}
          genre={genre}
          era={era}
          country={country}
          onMoodChange={setMood}
          onGenreChange={setGenre}
          onEraChange={setEra}
          onCountryChange={setCountry}
        />
      </div>
    );
  },
};
