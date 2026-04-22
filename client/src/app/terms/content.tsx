'use client';

import dynamic from 'next/dynamic';

const mdx: Record<string, React.ComponentType> = {
  ko: dynamic(() => import('../../../content/terms/ko.mdx')),
  en: dynamic(() => import('../../../content/terms/en.mdx')),
};

export function TermsContent({ locale }: { locale: string }) {
  const Content = mdx[locale] ?? mdx.ko;
  return <Content />;
}
