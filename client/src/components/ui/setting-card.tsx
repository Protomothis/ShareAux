'use client';

import type { ReactNode } from 'react';

import { Switch } from '@/components/ui/switch';

interface SettingCardProps {
  icon?: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  htmlFor: string;
  children?: ReactNode;
}

/** 토글 설정 카드 — 아이콘 + 라벨 + 설명 + 스위치, 하위 옵션 슬롯 */
export function SettingCard({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  htmlFor,
  children,
}: SettingCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center gap-3">
        {icon && <span className="text-base leading-none">{icon}</span>}
        <div className="min-w-0 flex-1">
          <label htmlFor={htmlFor} className="text-sm font-medium text-white">
            {label}
          </label>
          {description && <p className="text-[11px] leading-tight text-muted-foreground">{description}</p>}
        </div>
        <Switch id={htmlFor} checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      {checked && children && <div className="mt-3 border-t border-white/[0.06] pt-3">{children}</div>}
    </div>
  );
}
