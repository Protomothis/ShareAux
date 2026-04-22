import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { buttonVariants } from '@/components/ui/button';

export default async function RoomNotFound() {
  const t = await getTranslations('error');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-room-gradient text-white">
      <div className="text-center">
        <p className="mb-2 text-5xl">🎵</p>
        <h2 className="mb-2 text-xl font-semibold">{t('roomNotFound')}</h2>
        <p className="mb-6 text-sm text-white/50">{t('roomNotFoundDesc')}</p>
        <Link href="/rooms" className={buttonVariants({ variant: 'accent', size: 'default' })}>
          {t('backToRooms')}
        </Link>
      </div>
    </div>
  );
}
