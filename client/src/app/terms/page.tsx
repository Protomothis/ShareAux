import { getLocale, getTranslations } from 'next-intl/server';

import LegalPageLayout from '@/components/common/LegalPageLayout';
import { TermsContent } from './content';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: `ShareAux — ${t('terms')}` };
}

export default async function TermsPage() {
  const locale = await getLocale();
  const t = await getTranslations('common');

  return (
    <LegalPageLayout title={t('terms')} updatedAt={t('updatedDate')}>
      <TermsContent locale={locale} />
    </LegalPageLayout>
  );
}
