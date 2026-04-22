import type { ExternalToast } from 'sonner';
import { toast } from 'sonner';

import { ErrorCode } from '@/api/model';
import type { ServerErrorBody } from '@/types';

import { getErrorTranslator } from './i18n-error';

const isDev = process.env.NODE_ENV === 'development';

/** 토큰 만료/폐기 — 세션 만료 흐름에서 처리하므로 토스트 불필요 */
const TOKEN_EXPIRED_CODES: string[] = [ErrorCode.AUTH_013, ErrorCode.AUTH_014];

function devSuffix(code: string | undefined, method: string, path: string): string {
  if (!isDev) return '';
  return `\n${[code, method, path].filter(Boolean).join(' ')}`;
}

/** 서버 구조화 에러 또는 fallback toast */
export function notifyApiError(status: number, method: string, path: string, body: ServerErrorBody): void {
  if (status === 401 && (!body.code || TOKEN_EXPIRED_CODES.includes(body.code))) return;

  const t = getErrorTranslator();

  // 에러 코드 기반 번역
  if (body.code) {
    const title = t(`${body.code}.title`);
    const desc = t(`${body.code}.description`);
    if (title) {
      const description = desc + devSuffix(body.code, method, path);
      toast.error(title, { description: description || undefined } satisfies ExternalToast);
      return;
    }
  }

  // fallback
  const title = status >= 500 ? t('_fallback.serverError') : t(`_fallback.${status}`) || t('_fallback.default');
  const fallbackMsg = body.message ?? `Error ${status}`;
  const description = isDev ? `${status} ${method} ${path}\n${fallbackMsg}` : status >= 500 ? fallbackMsg : undefined;
  toast.error(title, { description } satisfies ExternalToast);
}
