import type { ReactNode } from 'react';

import { Surface } from '@/components/ui/surface';

interface SettingSectionProps {
  icon: string;
  title: string;
  children: ReactNode;
}

export function SettingSection({ icon, title, children }: SettingSectionProps) {
  return (
    <Surface>
      <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-white">
        <span>{icon}</span>
        {title}
      </h3>
      <div className="space-y-5">{children}</div>
    </Surface>
  );
}
