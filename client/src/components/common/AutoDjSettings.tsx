import { FormField } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingCard } from '@/components/ui/setting-card';
import type { AutoDjMode } from '@/types';

interface AutoDjSettingsProps {
  enabled: boolean;
  mode: string;
  threshold: number;
  onEnabledChange: (v: boolean) => void;
  onModeChange: (v: AutoDjMode) => void;
  onThresholdChange: (v: number) => void;
}

const modeLabels: Record<string, string> = {
  related: '🔗 관련곡',
  history: '📜 히스토리',
  popular: '🔥 인기곡',
  mixed: '🎲 혼합',
};

export default function AutoDjSettings({
  enabled,
  mode,
  threshold,
  onEnabledChange,
  onModeChange,
  onThresholdChange,
}: AutoDjSettingsProps) {
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
    </SettingCard>
  );
}
