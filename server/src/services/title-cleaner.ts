/** YouTube 제목/아티스트 워싱 유틸 — 가사 검색 + MusicBrainz 공용 */

/** 노이즈 제거용 정규식 */
const NOISE_RE = new RegExp(
  [
    'official\\s*(music\\s*)?video',
    'official\\s*audio',
    'official\\s*lyric\\s*video',
    'official\\s*visualizer',
    'official\\s*mv',
    'music\\s*video',
    'lyric\\s*video',
    'm\\/?v',
    'lyrics?',
    'audio',
    'video',
    'visualizer',
    'performance\\s*video',
    'dance\\s*practice',
    'color\\s*coded',
    'original\\s*mix',
    'full\\s*ver\\.?',
    'short\\s*ver\\.?',
    'ver\\.\\d+',
    'remaster(ed)?',
    'hd|hq|4k|1080p',
    'live',
    'stage',
    'teaser',
    'preview',
    'track\\s*\\d+',
    '가사',
    '공식',
    '뮤직비디오',
    '자막',
    '歌ってみた',
    'MV',
  ].join('|'),
  'gi',
);

/** 괄호류 정규식 (CJK 포함) */
const BRACKET_RE = /[【\[（(「『《][^】\]）)」』》]*[】\]）)」』》]/g;

/** 레이블/채널명 정규식 */
const LABEL_RE =
  /\s*(Stone\s*Music\s*Entertainment|HYBE\s*LABELS|SM\s*TOWN|JYP\s*Entertainment|YG\s*Entertainment|Warner\s*Music|Universal\s*Music|Sony\s*Music|Capitol\s*Records)\s*/gi;
const CHANNEL_NOISE_RE = /\s*(VEVO|Official|Records|Music|Entertainment|Labels|Channel|Topic)\s*/gi;

/** 전체 제목 워싱 — 검색 쿼리용 */
export function smartClean(title: string): string {
  const quoted = /['"]([^'"]+)['"]/.exec(title)?.[1];
  const noBracket = title
    .replace(BRACKET_RE, '')
    .replace(/\s*\/\s*THE FIRST TAKE.*/i, '')
    .replace(/\s*\/\s*/g, ' ');
  const noNoise = noBracket.replace(NOISE_RE, '');
  const noFeat = noNoise.replace(/\s*(feat\.?|ft\.?)\s*.*/i, '');
  const cleaned = noFeat.replace(/\s+/g, ' ').trim();
  return quoted ? `${cleaned} ${quoted}`.trim() : cleaned;
}

/** 곡명만 추출 — 아티스트 - 제목 패턴에서 제목 부분 */
export function extractTitle(name: string): string {
  const quoted = /['"]([^'"]+)['"]/.exec(name)?.[1];
  if (quoted) return quoted;
  const noBracket = name.replace(BRACKET_RE, '');
  const parts = noBracket.split(/\s*[-–—|~]\s*/);
  const raw = parts.length >= 2 ? parts.slice(1).join(' ') : noBracket;
  return raw
    .replace(/\s*\/\s*THE FIRST TAKE.*/i, '')
    .replace(/\s*\/\s*/g, ' ')
    .replace(NOISE_RE, '')
    .replace(/\s*(feat\.?|ft\.?)\s*.*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 아티스트명 워싱 — 레이블/채널명 제거 */
export function cleanArtist(artist: string): string {
  return artist
    .replace(LABEL_RE, '')
    .replace(CHANNEL_NOISE_RE, '')
    .replace(/\s*\/\s*.*/, '')
    .trim();
}
