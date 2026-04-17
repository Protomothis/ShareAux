'use client';

import type { ReactNode } from 'react';

import { Input } from '@/components/ui/input';

interface AdminPageHeaderProps {
  title: string;
  children?: ReactNode;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
}

export function AdminPageHeader({ title, children, search }: AdminPageHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <div className="flex items-center gap-2">
        {children}
        {search && (
          <Input
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder}
            className="w-full sm:w-64"
          />
        )}
      </div>
    </div>
  );
}
