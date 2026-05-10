import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import { ChipGroup } from '@/components/ui/chip-group';
import { ChipSelect } from '@/components/ui/chip-select';

const meta: Meta<typeof ChipSelect> = {
  title: 'Primitives/ChipSelect',
  component: ChipSelect,
};
export default meta;
type Story = StoryObj<typeof ChipSelect>;

const moodOptions = [
  { label: '잔잔한', value: 'calm' },
  { label: '신나는', value: 'upbeat' },
  { label: '감성적', value: 'emotional' },
  { label: '몽환적', value: 'dreamy' },
  { label: '에너지틱', value: 'energetic' },
  { label: '어두운', value: 'dark' },
];

const countryOptions = [
  { label: '한국', value: 'kr', icon: '🇰🇷' },
  { label: '일본', value: 'jp', icon: '🇯🇵' },
  { label: '미국', value: 'us', icon: '🇺🇸' },
  { label: '영국', value: 'gb', icon: '🇬🇧' },
  { label: '프랑스', value: 'fr', icon: '🇫🇷' },
  { label: '브라질', value: 'br', icon: '🇧🇷' },
  { label: '스페인', value: 'es', icon: '🇪🇸' },
  { label: '스웨덴', value: 'se', icon: '🇸🇪' },
];

const eraOptions = [
  { label: '최신', value: 'latest' },
  { label: '2010s', value: '2010s' },
  { label: '2000s', value: '2000s' },
  { label: '90s', value: '90s' },
  { label: '80s', value: '80s' },
  { label: '올드스쿨', value: 'oldschool' },
];

const genreOptions = [
  { label: '인디', value: 'indie' },
  { label: '팝', value: 'pop' },
  { label: '힙합', value: 'hiphop' },
  { label: 'R&B', value: 'rnb' },
  { label: '록', value: 'rock' },
  { label: '일렉', value: 'electronic' },
  { label: '재즈', value: 'jazz' },
  { label: '클래식', value: 'classical' },
];

export const MultiSelect: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(['calm']);
    return <ChipSelect options={moodOptions} value={value} onChange={setValue} />;
  },
};

export const SingleSelect: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(['2010s']);
    return <ChipSelect options={eraOptions} value={value} onChange={setValue} single />;
  },
};

export const WithIcons: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>(['kr', 'jp']);
    return <ChipSelect options={countryOptions} value={value} onChange={setValue} />;
  },
};

export const GroupedExample: Story = {
  name: 'ChipGroup (AI DJ 태그 전체)',
  render: () => {
    const [mood, setMood] = useState<string[]>([]);
    const [genre, setGenre] = useState<string[]>([]);
    const [era, setEra] = useState<string[]>([]);
    const [country, setCountry] = useState<string[]>([]);
    return (
      <div className="w-80 space-y-4 rounded-xl bg-black/90 p-4">
        <ChipGroup title="분위기" options={moodOptions} value={mood} onChange={setMood} />
        <ChipGroup title="장르" options={genreOptions} value={genre} onChange={setGenre} />
        <ChipGroup title="시대" options={eraOptions} value={era} onChange={setEra} single />
        <ChipGroup title="국가" options={countryOptions} value={country} onChange={setCountry} />
      </div>
    );
  },
};
