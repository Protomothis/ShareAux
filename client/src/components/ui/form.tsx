import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Label } from '@/components/ui/label';

interface FormSectionProps {
  title: string;
  children: ReactNode;
}

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</label>
      {children}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  description?: string;
  error?: string;
  inline?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({ label, description, error, inline, htmlFor, className, children }: FormFieldProps) {
  if (inline) {
    return (
      <div className={cn('flex items-center justify-between gap-4', className)}>
        <div className="space-y-0.5">
          <Label htmlFor={htmlFor} className="text-sm">
            {label}
          </Label>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-sm">
        {label}
      </Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {children}
      {error && <p className={cn('text-xs text-destructive')}>{error}</p>}
    </div>
  );
}
