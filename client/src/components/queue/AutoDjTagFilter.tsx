'use client';

import { useTranslations } from 'next-intl';

import type { ChipOption } from '@/components/ui/chip-select';
import { ChipGroup } from '@/components/ui/chip-group';
import { cn } from '@/lib/utils';

export interface AutoDjTags {
  mood: string[];
  genre: string[];
  era: string[];
  country: string[];
}

interface AutoDjTagFilterProps {
  value: AutoDjTags;
  onChange: (tags: AutoDjTags) => void;
  /** 서버에서 가져온 프리셋 (미제공 시 기본값 사용) */
  presets?: { mood?: ChipOption[]; genre?: ChipOption[]; era?: ChipOption[]; country?: ChipOption[] };
  className?: string;
}

const DEFAULT_MOOD: ChipOption[] = [
  { label: '잔잔한', value: 'calm' },
  { label: '신나는', value: 'upbeat' },
  { label: '감성적', value: 'emotional' },
  { label: '몽환적', value: 'dreamy' },
  { label: '에너지틱', value: 'energetic' },
  { label: '어두운', value: 'dark' },
];

const DEFAULT_GENRE: ChipOption[] = [
  { label: '인디', value: 'indie' },
  { label: '팝', value: 'pop' },
  { label: '힙합', value: 'hiphop' },
  { label: 'R&B', value: 'rnb' },
  { label: '록', value: 'rock' },
  { label: '일렉', value: 'electronic' },
  { label: '재즈', value: 'jazz' },
  { label: '클래식', value: 'classical' },
];

const DEFAULT_ERA: ChipOption[] = [
  { label: '최신', value: 'latest' },
  { label: '2010s', value: '2010s' },
  { label: '2000s', value: '2000s' },
  { label: '90s', value: '90s' },
  { label: '80s', value: '80s' },
  { label: '올드스쿨', value: 'oldschool' },
];

const DEFAULT_COUNTRY: ChipOption[] = [
  { label: '한국', value: 'kr', icon: '🇰🇷' },
  { label: '일본', value: 'jp', icon: '🇯🇵' },
  { label: '미국', value: 'us', icon: '🇺🇸' },
  { label: '영국', value: 'gb', icon: '🇬🇧' },
  { label: '프랑스', value: 'fr', icon: '🇫🇷' },
  { label: '브라질', value: 'br', icon: '🇧🇷' },
  { label: '스페인', value: 'es', icon: '🇪🇸' },
  { label: '스웨덴', value: 'se', icon: '🇸🇪' },
];

export function AutoDjTagFilter({ value, onChange, presets, className }: AutoDjTagFilterProps) {
  const t = useTranslations('player.autoDj');

  const update = (key: keyof AutoDjTags) => (v: string[]) => onChange({ ...value, [key]: v });

  return (
    <div className={cn('space-y-3', className)}>
      <ChipGroup
        title={t('mood')}
        options={presets?.mood ?? DEFAULT_MOOD}
        value={value.mood}
        onChange={update('mood')}
      />
      <ChipGroup
        title={t('genre')}
        options={presets?.genre ?? DEFAULT_GENRE}
        value={value.genre}
        onChange={update('genre')}
      />
      <ChipGroup
        title={t('era')}
        options={presets?.era ?? DEFAULT_ERA}
        value={value.era}
        onChange={update('era')}
        single
      />
      <ChipGroup
        title={t('country')}
        options={presets?.country ?? DEFAULT_COUNTRY}
        value={value.country}
        onChange={update('country')}
      />
    </div>
  );
}
