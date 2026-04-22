import { getLocale, getTranslations } from 'next-intl/server';

import LegalPageLayout from '@/components/common/LegalPageLayout';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: `ShareAux — ${t('terms')}` };
}

export default async function TermsPage() {
  const locale = await getLocale();
  const t = await getTranslations('common');
  const { default: Content } = await import(`../../../content/terms/${locale}.mdx`);

  return (
    <LegalPageLayout title={t('terms')} updatedAt={t('updatedDate')}>
      <Content />
    </LegalPageLayout>
  );
}
