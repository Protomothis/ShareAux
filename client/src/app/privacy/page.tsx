import { getLocale, getTranslations } from 'next-intl/server';

import LegalPageLayout from '@/components/common/LegalPageLayout';
import { PrivacyContent } from './content';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: `ShareAux — ${t('privacyPolicy')}` };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const t = await getTranslations('common');

  return (
    <LegalPageLayout title={t('privacyPolicy')} updatedAt={t('updatedDate')}>
      <PrivacyContent locale={locale} />
    </LegalPageLayout>
  );
}
