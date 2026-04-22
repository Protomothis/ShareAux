type ErrorMessages = Record<string, Record<string, string>>;

let cachedLocale = '';
let cachedMessages: ErrorMessages = {};

function getLocale(): string {
  if (typeof document === 'undefined') return 'ko';
  return document.cookie.match(/(?:^|; )locale=([^;]*)/)?.[1] || 'ko';
}

async function loadMessages(locale: string): Promise<ErrorMessages> {
  const all = (await import(`../../messages/${locale}.json`)).default;
  return all.errorCode ?? {};
}

/** 에러 코드 번역기 — React 컨텍스트 밖에서 사용 */
export function getErrorTranslator(): (key: string) => string {
  const locale = getLocale();

  // 비동기 로드 — 캐시 미스 시 다음 호출에서 사용
  if (locale !== cachedLocale) {
    cachedLocale = locale;
    loadMessages(locale).then((m) => {
      cachedMessages = m;
    });
  }

  return (key: string): string => {
    const parts = key.split('.');
    if (parts[0] === '_fallback') {
      const fallbacks: Record<string, Record<string, string>> = {
        ko: {
          serverError: '서버 오류가 발생했습니다',
          default: '요청 처리에 실패했습니다',
          400: '요청이 올바르지 않습니다',
          403: '권한이 없습니다',
          404: '요청한 리소스를 찾을 수 없습니다',
          409: '이미 처리된 요청입니다',
          429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요',
        },
        en: {
          serverError: 'Server error',
          default: 'Request failed',
          400: 'Invalid request',
          403: 'Permission denied',
          404: 'Resource not found',
          409: 'Already processed',
          429: 'Too many requests. Please try again later',
        },
      };
      return fallbacks[locale]?.[parts[1]] ?? fallbacks.ko[parts[1]] ?? '';
    }
    const code = parts[0];
    const field = parts[1]; // 'title' or 'description'
    return cachedMessages[code]?.[field] ?? '';
  };
}
