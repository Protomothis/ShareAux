import { detectLang } from './detect-lang.js';

describe('detectLang', () => {
  it('한국어 감지', () => {
    expect(detectLang('사랑은 늘 도망가')).toBe('ko');
  });

  it('일본어 감지 (히라가나)', () => {
    expect(detectLang('夜に駆ける')).toBe('ja');
  });

  it('일본어 감지 (가타카나 + 한자)', () => {
    expect(detectLang('ヨアソビの新曲')).toBe('ja');
  });

  it('중국어 감지 (한자만)', () => {
    expect(detectLang('月亮代表我的心')).toBe('zh');
  });

  it('영어 감지', () => {
    expect(detectLang('Love is a beautiful thing')).toBe('en');
  });

  it('빈 문자열 → null', () => {
    expect(detectLang('')).toBeNull();
  });

  it('숫자/기호만 → null', () => {
    expect(detectLang('123 !@#')).toBeNull();
  });

  it('한글 + 영어 혼합 → 한국어 우선', () => {
    expect(detectLang('아이유 Blueming')).toBe('ko');
  });
});
