import './globals.css';

import type { Viewport } from 'next';
import { Outfit } from 'next/font/google';
import localFont from 'next/font/local';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Toaster } from 'sonner';

import { ApiErrorToaster } from '@/components/common/ApiErrorToaster';

import ErrorBoundary from '@/components/common/ErrorBoundary';

import Providers from './providers';

const pretendard = localFont({
  src: '../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
  weight: '100 900',
});
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export async function generateMetadata() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3001';
  const proto = h.get('x-forwarded-proto') || 'http';
  const baseUrl = `${proto}://${host}`;
  const t = await getTranslations('meta');

  return {
    metadataBase: new URL(baseUrl),
    title: { default: 'ShareAux', template: '%s | ShareAux' },
    description: t('description'),
    openGraph: {
      title: 'ShareAux',
      description: t('description'),
      type: 'website',
      siteName: 'ShareAux',
      images: [{ url: '/og.png', width: 1200, height: 630, alt: 'ShareAux' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'ShareAux',
      description: t('shortDescription'),
      images: ['/og.png'],
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ff4081',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`dark ${pretendard.variable} ${outfit.variable} h-full overflow-hidden`}>
      <body className="h-full overflow-hidden bg-sa-bg-primary font-[family-name:var(--font-pretendard)] text-sa-text-primary antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <ErrorBoundary>{children}</ErrorBoundary>
          </Providers>
          <ApiErrorToaster />
        </NextIntlClientProvider>
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
