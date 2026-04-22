import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import AdminShell from '@/components/admin/AdminShell';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: t('admin') };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
