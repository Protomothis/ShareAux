import { FormField } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';

interface BoolFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function BoolField({ label, description, value, onChange, disabled, disabledReason }: BoolFieldProps) {
  return (
    <FormField label={label} description={disabled && disabledReason ? disabledReason : description} inline>
      <Switch checked={value === 'true'} onCheckedChange={(v) => onChange(String(v))} disabled={disabled} />
    </FormField>
  );
}
