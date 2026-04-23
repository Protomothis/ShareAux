/** API 에러 이벤트 버스 — interceptor → React 컴포넌트 브릿지 */

interface ApiErrorDetail {
  code?: string;
  status: number;
  method: string;
  path: string;
  message?: string;
}

type ApiErrorHandler = (detail: ApiErrorDetail) => void;

let handler: ApiErrorHandler | null = null;

export function onApiError(fn: ApiErrorHandler): () => void {
  handler = fn;
  return () => {
    handler = null;
  };
}

export function emitApiError(detail: ApiErrorDetail): void {
  handler?.(detail);
}
