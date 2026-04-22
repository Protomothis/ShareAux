import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import { WsEnumsSchemaLanguage } from '@/api/model';

const SUPPORTED_LOCALES = Object.values(WsEnumsSchemaLanguage);
export type Locale = WsEnumsSchemaLanguage;
export const DEFAULT_LOCALE = WsEnumsSchemaLanguage.ko;

export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get('locale')?.value;
  const locale = SUPPORTED_LOCALES.includes(raw as Locale) ? (raw as Locale) : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
