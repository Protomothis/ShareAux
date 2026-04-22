import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: t('rooms') };
}

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
