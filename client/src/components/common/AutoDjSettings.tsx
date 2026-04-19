import { useFavoritesControllerListFolders } from '@/api/favorites/favorites';
import { FormField } from '@/components/ui/form';
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

const modeLabels: Record<string, string> = {
  related: '🔗 관련곡',
  history: '📜 히스토리',
  popular: '🔥 인기곡',
  mixed: '🎲 혼합',
  favorites: '❤️ 즐겨찾기',
};

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

  return (
    <SettingCard
      icon="🤖"
      label="AutoDJ"
      description="큐가 비면 자동으로 곡 추가"
      htmlFor="autoDj"
      checked={enabled}
      onCheckedChange={onEnabledChange}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="모드">
          <Select value={mode} onValueChange={(v) => v && onModeChange(v as AutoDjMode)}>
            <SelectTrigger size="sm">
              <SelectValue placeholder="모드 선택">{modeLabels[mode] ?? mode}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="related">🔗 관련곡</SelectItem>
              <SelectItem value="history">📜 히스토리</SelectItem>
              <SelectItem value="popular">🔥 인기곡</SelectItem>
              <SelectItem value="mixed">🎲 혼합</SelectItem>
              <SelectItem value="favorites" disabled={!hasFavorites}>
                ❤️ 즐겨찾기{!hasFavorites ? ' (곡 없음)' : ''}
              </SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="트리거 기준">
          <Select value={String(threshold)} onValueChange={(v) => v && onThresholdChange(+v)}>
            <SelectTrigger size="sm">
              <SelectValue>남은 {threshold}곡 이하</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  남은 {n}곡 이하
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      {mode === 'favorites' && folders.length > 0 && (
        <div className="mt-3">
          <FormField label="폴더 필터">
            <Select value={folderId ?? '__all__'} onValueChange={(v) => onFolderIdChange?.(v === '__all__' ? null : v)}>
              <SelectTrigger size="sm">
                <SelectValue>
                  {folderId ? (folders.find((f) => f.id === folderId)?.name ?? '전체') : '전체'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">전체</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} ({f.trackCount}곡)
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
          즐겨찾기 곡 소진 시 혼합 모드로 전환
        </label>
      )}
    </SettingCard>
  );
}
