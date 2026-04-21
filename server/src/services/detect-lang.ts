/** 텍스트 기반 언어 감지 (ko/ja/zh/en) */
export function detectLang(text: string): string | null {
  const clean = text.replace(/[\s\p{P}\p{S}\d]/gu, '');
  if (!clean) return null;

  let kana = 0,
    cjk = 0,
    ko = 0,
    en = 0;

  for (const ch of clean) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x3040 && c <= 0x30ff)
      kana++; // 히라가나 + 가타카나
    else if (c >= 0x4e00 && c <= 0x9fff)
      cjk++; // 한자 (CJK Unified)
    else if (c >= 0xac00 && c <= 0xd7af)
      ko++; // 한글
    else if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) en++;
  }

  const total = kana + cjk + ko + en || 1;
  if (ko / total > 0.1) return 'ko';
  // 가나가 있으면 일본어 (한자도 일본어 맥락)
  if (kana > 0 && (kana + cjk) / total > 0.2) return 'ja';
  // 가나 없이 한자만 → 중국어
  if (cjk / total > 0.2) return 'zh';
  if (en / total > 0.3) return 'en';
  return null;
}
