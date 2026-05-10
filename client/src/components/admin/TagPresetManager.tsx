'use client';

import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface TagPreset {
  id: string;
  label: string;
  value: string;
  icon?: string;
}

/** 국가 코드 → 국기 이모지 */
function toFlag(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const COUNTRY_LIST = [
  { code: 'kr', label: '한국' },
  { code: 'jp', label: '일본' },
  { code: 'us', label: '미국' },
  { code: 'gb', label: '영국' },
  { code: 'fr', label: '프랑스' },
  { code: 'de', label: '독일' },
  { code: 'br', label: '브라질' },
  { code: 'es', label: '스페인' },
  { code: 'se', label: '스웨덴' },
  { code: 'it', label: '이탈리아' },
  { code: 'mx', label: '멕시코' },
  { code: 'au', label: '호주' },
  { code: 'ca', label: '캐나다' },
  { code: 'in', label: '인도' },
  { code: 'ng', label: '나이지리아' },
  { code: 'cn', label: '중국' },
  { code: 'tw', label: '대만' },
  { code: 'th', label: '태국' },
  { code: 'id', label: '인도네시아' },
  { code: 'ar', label: '아르헨티나' },
];

interface TagPresetCategoryProps {
  title: string;
  items: TagPreset[];
  onAdd: (label: string) => void;
  onRemove: (id: string) => void;
  onReorder?: (items: TagPreset[]) => void;
}

function TagPresetCategory({ title, items, onAdd, onRemove }: TagPresetCategoryProps) {
  const t = useTranslations('admin.settings');
  const [newLabel, setNewLabel] = useState('');

  const handleAdd = () => {
    if (newLabel.trim().length < 1) return;
    onAdd(newLabel.trim());
    setNewLabel('');
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-white/60">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5">
            <GripVertical size={12} className="shrink-0 text-white/20" />
            {item.icon && <span className="text-sm">{item.icon}</span>}
            <span className="flex-1 truncate text-xs text-white/80">{item.label}</span>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="shrink-0 text-white/20 transition-colors hover:text-red-400"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={t('tagPlaceholder')}
          maxLength={20}
          className="h-7 flex-1 rounded border-white/10 bg-white/5 text-xs"
        />
        <Button variant="ghost" size="icon-xs" onClick={handleAdd} disabled={!newLabel.trim()}>
          <Plus size={12} />
        </Button>
      </div>
    </div>
  );
}

function CountryPresetCategory({
  title,
  items,
  onAdd,
  onRemove,
}: {
  title: string;
  items: TagPreset[];
  onAdd: (code: string) => void;
  onRemove: (id: string) => void;
}) {
  const available = COUNTRY_LIST.filter((c) => !items.some((i) => i.value === c.code));

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-white/60">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5">
            <GripVertical size={12} className="shrink-0 text-white/20" />
            <span className="text-sm">{item.icon}</span>
            <span className="flex-1 truncate text-xs text-white/80">{item.label}</span>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="shrink-0 text-white/20 transition-colors hover:text-red-400"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      {available.length > 0 && (
        <select
          onChange={(e) => {
            if (e.target.value) onAdd(e.target.value);
            e.target.value = '';
          }}
          defaultValue=""
          className="h-7 w-full rounded border border-white/10 bg-white/5 px-2 text-xs text-white"
        >
          <option value="" disabled>
            국가 추가...
          </option>
          {available.map((c) => (
            <option key={c.code} value={c.code}>
              {toFlag(c.code)} {c.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

interface TagPresetManagerProps {
  mood: TagPreset[];
  genre: TagPreset[];
  era: TagPreset[];
  country: TagPreset[];
  onMoodChange: (items: TagPreset[]) => void;
  onGenreChange: (items: TagPreset[]) => void;
  onEraChange: (items: TagPreset[]) => void;
  onCountryChange: (items: TagPreset[]) => void;
  className?: string;
}

export function TagPresetManager({
  mood,
  genre,
  era,
  country,
  onMoodChange,
  onGenreChange,
  onEraChange,
  onCountryChange,
  className,
}: TagPresetManagerProps) {
  const t = useTranslations('admin.settings');

  const addTo = (items: TagPreset[], onChange: (items: TagPreset[]) => void) => (label: string) => {
    const id = crypto.randomUUID();
    const value = label.toLowerCase().replace(/\s+/g, '-');
    onChange([...items, { id, label, value }]);
  };

  const removeFrom = (items: TagPreset[], onChange: (items: TagPreset[]) => void) => (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  return (
    <div className={cn('space-y-4 rounded-lg bg-white/[0.02] p-4', className)}>
      <p className="text-sm font-medium text-white">{t('tagPresets')}</p>
      <TagPresetCategory
        title={t('tagMood')}
        items={mood}
        onAdd={addTo(mood, onMoodChange)}
        onRemove={removeFrom(mood, onMoodChange)}
      />
      <TagPresetCategory
        title={t('tagGenre')}
        items={genre}
        onAdd={addTo(genre, onGenreChange)}
        onRemove={removeFrom(genre, onGenreChange)}
      />
      <TagPresetCategory
        title={t('tagEra')}
        items={era}
        onAdd={addTo(era, onEraChange)}
        onRemove={removeFrom(era, onEraChange)}
      />
      <CountryPresetCategory
        title={t('tagCountry')}
        items={country}
        onAdd={(code) => {
          const c = COUNTRY_LIST.find((x) => x.code === code);
          if (!c || country.some((x) => x.value === code)) return;
          onCountryChange([...country, { id: crypto.randomUUID(), label: c.label, value: code, icon: toFlag(code) }]);
        }}
        onRemove={removeFrom(country, onCountryChange)}
      />
    </div>
  );
}
