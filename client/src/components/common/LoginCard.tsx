import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { surfaceVariants } from '@/components/ui/surface';
import { cn } from '@/lib/utils';

interface LoginCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}

export function LoginCard({ icon: Icon, title, description, href, onClick }: LoginCardProps) {
  const cls = cn(
    surfaceVariants({ variant: 'interactive', padding: 'none' }),
    'group flex w-full items-center gap-3 px-4 py-3 text-left sm:px-5 sm:py-4',
  );

  const content = (
    <>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sa-accent/20 sm:size-12">
        <Icon size={20} className="text-sa-accent sm:size-[22px]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white sm:text-base">{title}</p>
        <p className="text-[11px] text-sa-text-muted sm:text-xs">{description}</p>
      </div>
      <span className="text-white/20 transition group-hover:text-white/40">→</span>
    </>
  );

  if (href)
    return (
      <a href={href} className={cls}>
        {content}
      </a>
    );
  return (
    <Button variant="ghost" onClick={onClick} className={cn(cls, 'h-auto justify-start whitespace-normal')}>
      {content}
    </Button>
  );
}
