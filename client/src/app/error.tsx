'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('error');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <div className="text-center">
        <p className="mb-2 text-5xl">⚠️</p>
        <h2 className="mb-2 text-xl font-semibold">{t('title')}</h2>
        <p className="mb-6 text-sm text-white/50">{error.message || t('fallback')}</p>
        <Button variant="accent" onClick={reset} className="px-6 py-2.5">
          {t('retry')}
        </Button>
      </div>
    </div>
  );
}
