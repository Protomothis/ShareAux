'use client';

import dynamic from 'next/dynamic';

const mdx: Record<string, React.ComponentType> = {
  ko: dynamic(() => import('../../../content/privacy/ko.mdx')),
  en: dynamic(() => import('../../../content/privacy/en.mdx')),
};

export function PrivacyContent({ locale }: { locale: string }) {
  const Content = mdx[locale] ?? mdx.ko;
  return <Content />;
}
