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

export const customFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const baseUrl = getBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  const res = await fetch(fullUrl, { ...options, credentials: 'include' });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (typeof window !== 'undefined') {
      const method = (options?.method ?? 'GET').toUpperCase();
      import('../lib/api-error-toast').then((m) => m.notifyApiError(res.status, method, url, body)).catch(() => {});
    }
    const err = new ApiError(res.status, body, body.message as string);
    throw err;
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
};

export default customFetch;
