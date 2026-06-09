'use client';

import { ArrowLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/common/Button';
import Modal from '@/components/common/Modal';

// ─── Menu Item ──────────────────────────────────────────

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

export function MenuItem({ icon, label, description, onClick, variant = 'default' }: MenuItemProps) {
  const isDanger = variant === 'danger';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5 ${isDanger ? 'text-red-400' : 'text-white'}`}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
    </button>
  );
}

// ─── Sub-page Header ────────────────────────────────────

export function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon-xs" onClick={onBack}>
        <ArrowLeft size={16} />
      </Button>
      <Modal.Title>{title}</Modal.Title>
    </div>
  );
}
