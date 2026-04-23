import { FormField } from '@/components/ui/form';
import NumberStepper from '@/components/ui/number-stepper';

interface NumFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  disabledReason?: string;
}

export function NumField({ label, description, value, onChange, min, max, disabled, disabledReason }: NumFieldProps) {
  return (
    <FormField label={label} description={disabled && disabledReason ? disabledReason : description} inline>
      <NumberStepper
        value={Number(value) || 0}
        onChange={(v) => onChange(String(v))}
        min={min}
        max={max}
        size="sm"
        disabled={disabled}
      />
    </FormField>
  );
}
