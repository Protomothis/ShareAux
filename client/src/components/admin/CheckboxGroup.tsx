import { Button } from '@/components/common/Button';

interface CheckboxOption {
  key: string;
  label: string;
  disabled?: boolean;
}

interface CheckboxGroupProps {
  label?: string;
  options: CheckboxOption[];
  selected: Set<string>;
  onChange: (key: string) => void;
}

export function CheckboxGroup({ label, options, selected, onChange }: CheckboxGroupProps) {
  return (
    <div role="group" aria-label={label}>
      {label && <label className="mb-2 block text-xs text-sa-text-muted">{label}</label>}
      <div className="flex flex-wrap gap-2">
        {options.map(({ key, label: optLabel, disabled }) => {
          const active = selected.has(key);
          return (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => !disabled && onChange(key)}
              className={`${
                active
                  ? 'bg-sa-accent/15 text-sa-accent border border-sa-accent/30'
                  : 'bg-white/5 text-sa-text-muted border border-white/5 hover:border-white/10 hover:text-white'
              } ${disabled ? 'opacity-60 cursor-default' : ''}`}
            >
              {optLabel}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
