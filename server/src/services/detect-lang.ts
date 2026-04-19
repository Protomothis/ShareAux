/** 텍스트 기반 언어 감지 (ko/ja/en) */
export function detectLang(text: string): string | null {
  const clean = text.replace(/[\s\p{P}\p{S}\d]/gu, '');
  if (!clean) return null;
  let ja = 0,
    ko = 0,
    en = 0;
  for (const ch of clean) {
    const c = ch.codePointAt(0)!;
    if ((c >= 0x3040 && c <= 0x30ff) || (c >= 0x4e00 && c <= 0x9fff)) ja++;
    else if (c >= 0xac00 && c <= 0xd7af) ko++;
    else if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) en++;
  }
  const total = ja + ko + en || 1;
  if (ko / total > 0.1) return 'ko';
  if (ja / total > 0.2) return 'ja';
  if (en / total > 0.3) return 'en';
  return null;
}
