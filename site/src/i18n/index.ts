import en from './en.json';
import ko from './ko.json';

const translations = { en, ko } as const;
export type Lang = keyof typeof translations;

export function t(lang: Lang) {
  return translations[lang];
}

export function getLangFromUrl(url: URL): Lang {
  const [, base, langSeg] = url.pathname.split('/');
  // base = 'ShareAux', langSeg = 'ko' or page
  if (langSeg === 'ko') return 'ko';
  return 'en';
}

export function getLocalePath(lang: Lang, path: string = ''): string {
  const base = '/ShareAux';
  if (lang === 'ko') return `${base}/ko${path}`;
  return `${base}${path}`;
}
