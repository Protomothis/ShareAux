import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

const surfaceVariants = cva('rounded-2xl', {
  variants: {
    variant: {
      default: 'border border-white/5 bg-white/[0.03]',
      elevated: 'border border-white/10 bg-white/5',
      glass: 'border border-white/10 bg-black/80 backdrop-blur-2xl',
      danger: 'border border-red-500/10 bg-red-500/[0.03]',
      interactive:
        'border border-white/10 bg-white/5 backdrop-blur-2xl transition-all duration-300 cursor-pointer hover:border-sa-accent/30 hover:bg-white/10',
    },
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-4 sm:p-5',
      lg: 'p-5 sm:p-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
  },
});

interface SurfaceProps extends VariantProps<typeof surfaceVariants>, HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Surface({ variant, padding, className, children, ...props }: SurfaceProps) {
  return (
    <div className={cn(surfaceVariants({ variant, padding }), className)} {...props}>
      {children}
    </div>
  );
}

export { surfaceVariants };
