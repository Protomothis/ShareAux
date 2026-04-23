import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-12 text-center', className)}>
      {icon && <div className="mb-1 text-2xl">{icon}</div>}
      {title && <p className="text-sm font-medium text-sa-text-secondary">{title}</p>}
      {description && <p className="text-xs text-sa-text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
