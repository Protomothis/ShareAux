const SUPPORTED_URL_PATTERN = /^https?:\/\/(www\.|music\.|m\.)?(youtube\.com|youtu\.be)\//i;

/** 클립보드 텍스트가 지원되는 미디어 URL인지 판별 (UX 힌트용) */
export function isSupportedMediaUrl(text: string): boolean {
  return SUPPORTED_URL_PATTERN.test(text.trim());
}
