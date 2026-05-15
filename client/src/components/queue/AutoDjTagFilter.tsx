'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { RangeSlider } from '@/components/common/RangeSlider';
import type { ChipOption } from '@/components/ui/chip-select';
import { ChipGroup } from '@/components/ui/chip-group';
import { cn } from '@/lib/utils';

export interface AutoDjTags {
  mood: string[];
  genre: string[];
  era: string[];
  country: string[];
  taste?: string;
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
  'game',
  'lofi',
  'metal',
  'soul',
  'reggae',
  'folk',
] as const;
const ERA_VALUES = ['latest', '2010s', '2000s', '90s', '80s', '70s', 'oldschool'] as const;
const COUNTRY_VALUES = ['kr', 'jp', 'us', 'gb', 'fr', 'br', 'es', 'se', 'cn', 'au', 'in'] as const;
const TASTE_VALUES = ['mainstream', 'neutral', 'underground'] as const;

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

  const update = useCallback(
    (key: keyof AutoDjTags) => (v: string[]) => onChange({ ...value, [key]: v }),
    [value, onChange],
  );

  return (
    <div className={cn('space-y-3', className)}>
      <ChipGroup title={t('mood')} options={moodOptions} value={value.mood} onChange={update('mood')} />
      <ChipGroup title={t('genre')} options={genreOptions} value={value.genre} onChange={update('genre')} />
      <ChipGroup title={t('era')} options={eraOptions} value={value.era} onChange={update('era')} single />
      <ChipGroup title={t('country')} options={countryOptions} value={value.country} onChange={update('country')} />
      <div className="space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">{t('taste')}</p>
        <RangeSlider
          value={
            TASTE_VALUES.indexOf((value.taste ?? 'neutral') as (typeof TASTE_VALUES)[number]) >= 0
              ? TASTE_VALUES.indexOf((value.taste ?? 'neutral') as (typeof TASTE_VALUES)[number])
              : 1
          }
          onChange={(v) => onChange({ ...value, taste: TASTE_VALUES[v] })}
          min={0}
          max={2}
          step={1}
          labelStart={t('tasteMainstream')}
          labelCenter={t('tasteNeutral')}
          labelEnd={t('tasteUnderground')}
        />
      </div>
    </div>
  );
}
