'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import type { ErrorCode } from '@/api/model';
import { onApiError } from '@/lib/api-error-bus';

const isDev = process.env.NODE_ENV === 'development';

export function ApiErrorToaster() {
  const tt = useTranslations('errorTitle');
  const td = useTranslations('errorDesc');
  const ta = useTranslations('apiError');

  useEffect(
    () =>
      onApiError(({ code, status, method, path, message }) => {
        const dev = isDev ? `\n${[code, method, path].filter(Boolean).join(' ')}` : '';

        if (code) {
          const ec = code as ErrorCode;
          const title = tt(ec);
          if (title && !title.startsWith('errorTitle.')) {
            const desc = td(ec);
            const description = (desc.startsWith('errorDesc.') ? '' : desc) + dev || undefined;
            toast.error(title, { description });
            return;
          }
        }

        const title = status >= 500 ? ta('serverError') : (ta(`${status}` as never) as string) || ta('fallback');
        const fallback = message ?? `Error ${status}`;
        toast.error(title.startsWith('apiError.') ? fallback : title, {
          description: isDev ? `${status} ${method} ${path}\n${fallback}` : status >= 500 ? fallback : undefined,
        });
      }),
    [tt, td, ta],
  );

  return null;
}
