/**
 * URL 유틸 — dev/prod 모두 호환되는 API/WS URL 집중 관리
 *
 * 원칙:
 * - 클라이언트(브라우저): window.location 기반 → 어떤 디바이스/프록시에서든 동작
 * - 서버(SSR/generateMetadata): INTERNAL_API_URL 환경변수 → 컨테이너 간 통신
 * - dev: Next.js rewrite가 /api → localhost:3000 프록시, WS는 서버 포트 직접 연결
 * - prod: nginx가 /api + /ws 모두 프록시 → 같은 origin 사용
 */

const DEV_SERVER_PORT = '3000';
const DEV_CLIENT_PORT = '3001';
const DEV_SSL_CLIENT_PORT = process.env.NEXT_PUBLIC_SSL_CLIENT_PORT || '8443';
const DEV_SSL_SERVER_PORT = process.env.NEXT_PUBLIC_SSL_SERVER_PORT || '8444';

/** 브라우저에서 API 호출용 base URL (orval customFetch에서 사용) */
export function getApiUrl(): string {
  if (typeof window !== 'undefined') return `${window.location.origin}/api`;
  return `http://localhost:${DEV_SERVER_PORT}/api`;
}

/** 서버 컴포넌트(generateMetadata 등)에서 API 호출용 URL */
export function getServerApiUrl(): string {
  return process.env.INTERNAL_API_URL || `http://localhost:${DEV_SERVER_PORT}/api`;
}

/** WebSocket 연결 URL */
export function getWsUrl(): string {
  if (typeof window === 'undefined') return `ws://localhost:${DEV_SERVER_PORT}/ws`;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const port = window.location.port;
  const isDev = port === DEV_CLIENT_PORT || port === DEV_SSL_CLIENT_PORT;
  const serverPort = port === DEV_SSL_CLIENT_PORT ? DEV_SSL_SERVER_PORT : DEV_SERVER_PORT;
  const host = isDev ? `${window.location.hostname}:${serverPort}` : window.location.host;
  return `${proto}//${host}/ws`;
}

/** sendBeacon 등 브라우저에서 절대 URL이 필요한 경우 */
export function getBeaconUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

/** HTTP 오디오 스트림 URL (Cast/AirPlay용) */
export function getStreamUrl(roomId: string, token: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/api/rooms/${roomId}/stream?token=${encodeURIComponent(token)}`;
}
