/**
 * orval mutator + 공용 fetch wrapper
 * orval 생성 코드 및 수동 API 호출 모두 이 파일을 사용
 * 주의: orval이 이 파일을 평가하므로 @/ alias import 금지
 */
const getBaseUrl = () => {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.INTERNAL_API_URL?.replace(/\/api$/, '') || 'http://localhost:3000';
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: Record<string, unknown>,
    message?: string,
  ) {
    super(message ?? `API Error ${status}`);
  }

  get code(): string | undefined {
    return this.body.code as string | undefined;
  }
}

// 동시 401 발생 시 refresh 요청 공유
let refreshPromise: Promise<boolean> | null = null;

const SKIP_RETRY_PATHS = ['/api/auth/refresh', '/api/auth/login', '/api/auth/register', '/api/auth/guest'];

const tryRefresh = (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = fetch(`${getBaseUrl()}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const handleError = (status: number, body: Record<string, unknown>, url: string, options?: RequestInit) => {
  if (typeof window !== 'undefined') {
    const method = (options?.method ?? 'GET').toUpperCase();
    // GET 404는 react-query가 처리 — 토스트 불필요
    if (!(method === 'GET' && status === 404)) {
      import('../lib/api-error-toast').then((m) => m.notifyApiError(status, method, url, body)).catch(() => {});
    }
  }
  throw new ApiError(status, body, body.message as string);
};

export const customFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const baseUrl = getBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  const res = await fetch(fullUrl, { ...options, credentials: 'include' });

  // 401 + retry 대상 → refresh 후 1회 재시도
  if (res.status === 401 && typeof window !== 'undefined' && !SKIP_RETRY_PATHS.some((p) => url.startsWith(p))) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      const retry = await fetch(fullUrl, { ...options, credentials: 'include' });
      if (!retry.ok) {
        const body = await retry.json().catch(() => ({}));
        handleError(retry.status, body, url, options);
      }
      const text = await retry.text();
      return (text ? JSON.parse(text) : null) as T;
    }
    // refresh 실패 → 원래 401 에러 throw
    const body = await res.json().catch(() => ({}));
    handleError(res.status, body, url, options);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    handleError(res.status, body, url, options);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
};

export default customFetch;
