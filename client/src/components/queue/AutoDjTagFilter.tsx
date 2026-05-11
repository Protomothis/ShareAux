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
  className?: string;
}

const MOOD_VALUES = [
  'calm',
  'upbeat',
  'emotional',
  'dreamy',
  'energetic',
  'dark',
  'chill',
  'melancholy',
  'epic',
  'romantic',
  'nostalgic',
] as const;
const GENRE_VALUES = [
  'indie',
  'pop',
  'hiphop',
  'rnb',
  'rock',
  'electronic',
  'jazz',
  'classical',
  'anime',
  'lofi',
  'metal',
  'soul',
  'reggae',
  'folk',
] as const;
const ERA_VALUES = ['latest', '2010s', '2000s', '90s', '80s', '70s', 'oldschool'] as const;
const COUNTRY_VALUES = ['kr', 'jp', 'us', 'gb', 'fr', 'br', 'es', 'se', 'cn', 'au', 'in'] as const;

const COUNTRY_ICONS: Record<string, string> = {
  kr: '🇰🇷',
  jp: '🇯🇵',
  us: '🇺🇸',
  gb: '🇬🇧',
  fr: '🇫🇷',
  br: '🇧🇷',
  es: '🇪🇸',
  se: '🇸🇪',
  cn: '🇨🇳',
  au: '🇦🇺',
  in: '🇮🇳',
};

export function AutoDjTagFilter({ value, onChange, className }: AutoDjTagFilterProps) {
  const t = useTranslations('player.autoDj');

  const moodOptions: ChipOption[] = MOOD_VALUES.map((v) => ({ label: t(`tagMood_${v}`), value: v }));
  const genreOptions: ChipOption[] = GENRE_VALUES.map((v) => ({ label: t(`tagGenre_${v}`), value: v }));
  const eraOptions: ChipOption[] = ERA_VALUES.map((v) => ({ label: t(`tagEra_${v}`), value: v }));
  const countryOptions: ChipOption[] = COUNTRY_VALUES.map((v) => ({
    label: t(`tagCountry_${v}`),
    value: v,
    icon: COUNTRY_ICONS[v],
  }));

  const update = (key: keyof AutoDjTags) => (v: string[]) => onChange({ ...value, [key]: v });

  return (
    <div className={cn('space-y-3', className)}>
      <ChipGroup title={t('mood')} options={moodOptions} value={value.mood} onChange={update('mood')} />
      <ChipGroup title={t('genre')} options={genreOptions} value={value.genre} onChange={update('genre')} />
      <ChipGroup title={t('era')} options={eraOptions} value={value.era} onChange={update('era')} single />
      <ChipGroup title={t('country')} options={countryOptions} value={value.country} onChange={update('country')} />
    </div>
  );
}
