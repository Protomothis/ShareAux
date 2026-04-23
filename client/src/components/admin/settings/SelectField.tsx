import { FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SelectFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  disabled?: boolean;
  disabledReason?: string;
}

export function SelectField({
  label,
  description,
  value,
  onChange,
  options,
  disabled,
  disabledReason,
}: SelectFieldProps) {
  const allOptions = options.length ? options : value ? [value] : [];
  return (
    <FormField label={label} description={disabled && disabledReason ? disabledReason : description} inline>
      {allOptions.length ? (
        <Select value={value} onValueChange={(v) => v && onChange(v)} disabled={disabled}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allOptions.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-64" disabled={disabled} />
      )}
    </FormField>
  );
}
