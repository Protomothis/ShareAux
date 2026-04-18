import type { ExternalToast } from 'sonner';
import { toast } from 'sonner';

import type { ServerErrorBody } from '@/types';

const isDev = process.env.NODE_ENV === 'development';

const FALLBACK_MESSAGES: Record<number, string> = {
  400: '요청이 올바르지 않습니다',
  403: '권한이 없습니다',
  404: '요청한 리소스를 찾을 수 없습니다',
  409: '이미 처리된 요청입니다',
  429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요',
};

function devSuffix(code: string | undefined, method: string, path: string): string {
  if (!isDev) return '';
  return `\n${[code, method, path].filter(Boolean).join(' ')}`;
}

/** 서버 구조화 에러 또는 fallback toast */
export function notifyApiError(status: number, method: string, path: string, body: ServerErrorBody): void {
  if (status === 401) return;

  // 서버 메타 기반 (code + title 존재)
  if (body.code && body.title) {
    const description = (body.description ?? '') + devSuffix(body.code, method, path);
    toast.error(body.title, { description: description || undefined } satisfies ExternalToast);
    return;
  }

  // fallback
  const title = status >= 500 ? '서버 오류가 발생했습니다' : (FALLBACK_MESSAGES[status] ?? '요청 처리에 실패했습니다');
  const fallbackMsg = body.message ?? `Error ${status}`;
  const description = isDev ? `${status} ${method} ${path}\n${fallbackMsg}` : status >= 500 ? fallbackMsg : undefined;
  toast.error(title, { description } satisfies ExternalToast);
}
