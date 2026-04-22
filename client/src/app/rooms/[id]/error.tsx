'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('error');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-room-gradient text-white">
      <div className="text-center">
        <p className="mb-2 text-5xl">🎵</p>
        <h2 className="mb-2 text-xl font-semibold">{t('roomError')}</h2>
        <p className="mb-6 text-sm text-white/50">{error.message || t('roomErrorFallback')}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={reset} className="border-white/10 px-6 py-2.5 hover:bg-white/5">
            {t('retry')}
          </Button>
          <Button variant="accent" className="px-6 py-2.5" render={<Link href="/rooms" />}>
            {t('backToRooms')}
          </Button>
        </div>
      </div>
    </div>
  );
}
