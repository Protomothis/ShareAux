/** 지원되는 미디어 URL 파싱 결과 */
export type ParsedMediaUrl =
  | { type: 'video'; provider: 'yt'; id: string }
  | { type: 'playlist'; provider: 'yt'; id: string }
  | { type: 'unsupported'; reason: 'invalid' | 'unsupported_platform' };

const YT_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'music.youtube.com',
  'm.youtube.com',
  'youtu.be',
]);

/**
 * 미디어 URL을 파싱하여 provider/type/id를 반환합니다.
 * - RD prefix (Mix/Radio) + videoId → video로 폴백
 * - 재생목록 URL (list= 포함) → playlist
 * - 단일 영상 URL → video
 */
export function parseMediaUrl(input: string): ParsedMediaUrl {
  const trimmed = input.trim();

  let url: URL;
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return { type: 'unsupported', reason: 'invalid' };
  }

  const host = url.hostname.replace(/^www\./, '');

  if (!YT_HOSTS.has(url.hostname) && host !== 'youtube.com' && host !== 'youtu.be') {
    return { type: 'unsupported', reason: 'unsupported_platform' };
  }

  const listId = url.searchParams.get('list');
  const videoId = url.searchParams.get('v') ?? (host === 'youtu.be' ? url.pathname.slice(1).split('/')[0] : null);

  // shorts
  const shortsMatch = url.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) return { type: 'video', provider: 'yt', id: shortsMatch[1] };

  // Mix/Radio (RD prefix) → videoId가 있으면 단일 영상으로 폴백
  if (listId?.startsWith('RD') && videoId) {
    return { type: 'video', provider: 'yt', id: videoId };
  }

  // 일반 재생목록
  if (listId) {
    return { type: 'playlist', provider: 'yt', id: listId };
  }

  // 단일 영상
  if (videoId) {
    return { type: 'video', provider: 'yt', id: videoId };
  }

  return { type: 'unsupported', reason: 'invalid' };
}
