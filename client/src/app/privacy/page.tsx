import { getLocale, getTranslations } from 'next-intl/server';

import LegalPageLayout from '@/components/common/LegalPageLayout';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: `ShareAux — ${t('privacyPolicy')}` };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const t = await getTranslations('common');
  const { default: Content } = await import(`../../../content/privacy/${locale}.mdx`);

  return (
    <LegalPageLayout title={t('privacyPolicy')} updatedAt={t('updatedDate')}>
      <Content />
    </LegalPageLayout>
  );
}
