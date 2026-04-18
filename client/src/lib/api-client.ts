import { getApiUrl } from '@/lib/urls';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_URL = getApiUrl();

// refresh 큐잉 — 동시 401 시 한 번만 refresh 호출
let refreshPromiseRef: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromiseRef) return refreshPromiseRef;
  refreshPromiseRef = fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromiseRef = null;
    });
  return refreshPromiseRef;
}

export const customFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const path = url.startsWith('/api') ? url.slice(4) : url;
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  if (options?.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const doFetch = () => fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: 'include' });

  let res = await doFetch();

  // 401 → refresh 시도 → 재요청 (1회)
  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/refresh')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch();
    } else if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
      throw new ApiError(401, 'Session expired');
    }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const method = options?.method ?? 'GET';
    const serverError = {
      code: typeof body.code === 'string' ? body.code : undefined,
      title: typeof body.title === 'string' ? body.title : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      statusCode: typeof body.statusCode === 'number' ? body.statusCode : undefined,
      message: typeof body.message === 'string' ? body.message : undefined,
    };
    if (typeof window !== 'undefined') {
      const { notifyApiError } = await import('@/lib/api-error-toast');
      notifyApiError(res.status, method, path, serverError);
    }
    throw new ApiError(res.status, serverError.title ?? serverError.message ?? `Error ${res.status}`, serverError.code);
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return {} as T;
  }

  return res.json() as Promise<T>;
};

export default customFetch;
