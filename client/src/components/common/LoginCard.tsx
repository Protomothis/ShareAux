import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface LoginCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}

export function LoginCard({ icon: Icon, title, description, href, onClick }: LoginCardProps) {
  const cls =
    'group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:px-5 sm:py-4 text-left transition hover:border-sa-accent/30 hover:bg-white/10';

  const content = (
    <>
      <div className="flex size-10 sm:size-12 shrink-0 items-center justify-center rounded-xl bg-sa-accent/20">
        <Icon size={20} className="text-sa-accent sm:size-[22px]" />
      </div>
      <div className="flex-1">
        <p className="text-sm sm:text-base font-semibold text-white">{title}</p>
        <p className="text-[11px] sm:text-xs text-sa-text-muted">{description}</p>
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
    <Button variant="ghost" onClick={onClick} className={`${cls} justify-start whitespace-normal h-auto`}>
      {content}
    </Button>
  );
}
