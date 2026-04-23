import { ErrorCode } from '@/api/model';
import type { ServerErrorBody } from '@/types';

import { emitApiError } from './api-error-bus';

/** 토큰 만료/폐기 — 세션 만료 흐름에서 처리하므로 토스트 불필요 */
const TOKEN_EXPIRED_CODES: string[] = [ErrorCode.AUTH_013, ErrorCode.AUTH_014];

/** 서버 에러 → 이벤트 발행 (React 컴포넌트에서 번역 + toast) */
export function notifyApiError(status: number, method: string, path: string, body: ServerErrorBody): void {
  if (status === 401 && (!body.code || TOKEN_EXPIRED_CODES.includes(body.code))) return;
  emitApiError({ code: body.code, status, method, path, message: body.message });
}
