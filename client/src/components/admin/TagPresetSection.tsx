'use client';

import { Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { adminControllerUpdateTagPresets, useAdminControllerGetTagPresets } from '@/api/admin/admin';
import type { TagPresetItemDto } from '@/api/model';
import type { TagPreset } from '@/components/admin/TagPresetManager';
import { TagPresetManager } from '@/components/admin/TagPresetManager';
import { Button } from '@/components/ui/button';

interface PresetState {
  mood: TagPreset[];
  genre: TagPreset[];
  era: TagPreset[];
  country: TagPreset[];
}

function toPresets(items: TagPresetItemDto[]): TagPreset[] {
  return items.map((i) => ({ id: i.id, label: i.label, value: i.value, icon: i.icon }));
}

export function TagPresetSection() {
  const t = useTranslations('admin.settings');
  const { data } = useAdminControllerGetTagPresets();
  const [state, setState] = useState<PresetState>({ mood: [], genre: [], era: [], country: [] });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const d = data as unknown as PresetState;
    setState({
      mood: toPresets(d.mood),
      genre: toPresets(d.genre),
      era: toPresets(d.era),
      country: toPresets(d.country),
    });
  }, [data]);

  const update = useCallback(
    (key: keyof PresetState) => (items: TagPreset[]) => {
      setState((p) => ({ ...p, [key]: items }));
      setDirty(true);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    await adminControllerUpdateTagPresets(state);
    toast.success(t('saved'));
    setDirty(false);
    setSaving(false);
  }, [state, t]);

  return (
    <div className="relative">
      <TagPresetManager
        mood={state.mood}
        genre={state.genre}
        era={state.era}
        country={state.country}
        onMoodChange={update('mood')}
        onGenreChange={update('genre')}
        onEraChange={update('era')}
        onCountryChange={update('country')}
      />
      {dirty && (
        <div className="mt-3 flex justify-end">
          <Button onClick={handleSave} disabled={saving} variant="accent" size="sm">
            {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Save size={14} className="mr-1.5" />}
            {t('save')}
          </Button>
        </div>
      )}
    </div>
  );
}
