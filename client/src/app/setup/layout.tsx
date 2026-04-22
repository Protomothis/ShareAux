import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: t('setup') };
}

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
