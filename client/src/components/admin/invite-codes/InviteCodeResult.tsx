'use client';

import { Check, Copy, Link } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

interface InviteCodeResultProps {
  code: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function InviteCodeResult({ code, title, description, actionLabel, onAction }: InviteCodeResultProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteUrl = `${window.location.origin}/login?code=${code}`;

  const copy = async (text: string, type: 'code' | 'link') => {
    await navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <span className="text-5xl">✅</span>
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm text-sa-text-secondary">{description}</p>
      </div>

      {/* 코드 */}
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3">
        <code className="text-lg font-bold tracking-wider text-sa-accent">{code}</code>
        <Button variant="ghost" size="icon-sm" onClick={() => copy(code, 'code')}>
          {copiedCode ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
        </Button>
      </div>

      {/* 초대 링크 */}
      <div className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
        <Link size={14} className="shrink-0 text-sa-text-muted" />
        <span className="min-w-0 flex-1 truncate text-left text-xs text-sa-text-muted">{inviteUrl}</span>
        <Button variant="ghost" size="icon-sm" onClick={() => copy(inviteUrl, 'link')}>
          {copiedLink ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
        </Button>
      </div>

      <Button variant="accent" onClick={onAction} className="w-full max-w-xs">
        {actionLabel}
      </Button>
    </div>
  );
}
