export enum TranslationLang {
  Ko = 'ko',
  En = 'en',
  Ja = 'ja',
  Zh = 'zh',
  ZhTW = 'zh-TW',
  Es = 'es',
  Fr = 'fr',
  De = 'de',
  Pt = 'pt',
  Th = 'th',
  Vi = 'vi',
  Id = 'id',
}

const TRANSLATION_LANG_VALUES: ReadonlySet<string> = new Set(Object.values(TranslationLang));

export function isTranslationLang(value: string): value is TranslationLang {
  return TRANSLATION_LANG_VALUES.has(value);
}
