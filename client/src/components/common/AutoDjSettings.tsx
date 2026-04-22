import { useFavoritesControllerListFolders } from '@/api/favorites/favorites';
import { FormField } from '@/components/ui/form';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingCard } from '@/components/ui/setting-card';
import type { AutoDjMode } from '@/types';

interface AutoDjSettingsProps {
  enabled: boolean;
  mode: string;
  threshold: number;
  folderId?: string | null;
  favFallbackMixed?: boolean;
  hasFavorites?: boolean;
  onEnabledChange: (v: boolean) => void;
  onModeChange: (v: AutoDjMode) => void;
  onThresholdChange: (v: number) => void;
  onFolderIdChange?: (v: string | null) => void;
  onFavFallbackMixedChange?: (v: boolean) => void;
}

export default function AutoDjSettings({
  enabled,
  mode,
  threshold,
  folderId,
  favFallbackMixed = false,
  hasFavorites = true,
  onEnabledChange,
  onModeChange,
  onThresholdChange,
  onFolderIdChange,
  onFavFallbackMixedChange,
}: AutoDjSettingsProps) {
  const { data: folders = [] } = useFavoritesControllerListFolders();
  const t = useTranslations('settings');
  const modeLabels: Record<string, string> = {
    related: t('autoDjRelated'),
    history: t('autoDjHistory'),
    popular: t('autoDjPopular'),
    mixed: t('autoDjMixed'),
    favorites: t('autoDjFavorites'),
  };

  return (
    <SettingCard
      icon="🤖"
      label="AutoDJ"
      description={t('autoDjDescription')}
      htmlFor="autoDj"
      checked={enabled}
      onCheckedChange={onEnabledChange}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label={t('autoDjMode')}>
          <Select value={mode} onValueChange={(v) => v && onModeChange(v as AutoDjMode)}>
            <SelectTrigger size="sm">
              <SelectValue placeholder={t('autoDjModePlaceholder')}>{modeLabels[mode] ?? mode}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="related">{t('autoDjRelated')}</SelectItem>
              <SelectItem value="history">{t('autoDjHistory')}</SelectItem>
              <SelectItem value="popular">{t('autoDjPopular')}</SelectItem>
              <SelectItem value="mixed">{t('autoDjMixed')}</SelectItem>
              <SelectItem value="favorites" disabled={!hasFavorites}>
                {t('autoDjFavorites')}
                {!hasFavorites ? t('autoDjFavEmpty') : ''}
              </SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label={t('autoDjThreshold')}>
          <Select value={String(threshold)} onValueChange={(v) => v && onThresholdChange(+v)}>
            <SelectTrigger size="sm">
              <SelectValue>{t('autoDjThresholdValue', { n: threshold })}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {t('autoDjThresholdValue', { n })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      {mode === 'favorites' && folders.length > 0 && (
        <div className="mt-3">
          <FormField label={t('autoDjFolder')}>
            <Select value={folderId ?? '__all__'} onValueChange={(v) => onFolderIdChange?.(v === '__all__' ? null : v)}>
              <SelectTrigger size="sm">
                <SelectValue>
                  {folderId
                    ? (folders.find((f) => f.id === folderId)?.name ?? t('autoDjFolderAll'))
                    : t('autoDjFolderAll')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('autoDjFolderAll')}</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {t('autoDjFolderItem', { name: f.name, count: f.trackCount })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      )}
      {mode === 'favorites' && (
        <label className="mt-2 flex items-center gap-2 text-xs text-sa-text-secondary">
          <input
            type="checkbox"
            checked={favFallbackMixed}
            onChange={(e) => onFavFallbackMixedChange?.(e.target.checked)}
            className="accent-sa-accent"
          />
          {t('autoDjFavFallback')}
        </label>
      )}
    </SettingCard>
  );
}
