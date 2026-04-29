import { TranslationService } from './translation.service.js';

// parseResponse는 private이므로 prototype에서 직접 접근
const parseResponse = (TranslationService.prototype as unknown as Record<string, unknown>)['parseResponse'] as (
  text: string,
  includeReading: boolean,
) => { translations: Map<number, string>; readings: Map<number, string> };

// bind 없이 호출 가능한 순수 함수
const parse = (text: string, includeReading: boolean) => parseResponse.call({}, text, includeReading);

describe('TranslationService.parseResponse', () => {
  it('표준 형식 N|번역', () => {
    const r = parse('1|모래를 털면\n2|널 사랑해', false);
    expect(r.translations.get(1)).toBe('모래를 털면');
    expect(r.translations.get(2)).toBe('널 사랑해');
  });

  it('표준 형식 N|번역|발음', () => {
    const r = parse('1|모래를 털면|스나오 하라에바\n2|널 사랑해|I love you', true);
    expect(r.translations.get(1)).toBe('모래를 털면');
    expect(r.readings.get(1)).toBe('스나오 하라에바');
    expect(r.translations.get(2)).toBe('널 사랑해');
    expect(r.readings.get(2)).toBe('I love you');
  });

  it('Gemini 변형: N. 번역 (마침표+공백)', () => {
    const r = parse('1. 모래를 털면\n2. 널 사랑해', false);
    expect(r.translations.get(1)).toBe('모래를 털면');
    expect(r.translations.get(2)).toBe('널 사랑해');
  });

  it('Gemini 변형: N) 번역', () => {
    const r = parse('1) 모래를 털면\n2) 널 사랑해', false);
    expect(r.translations.get(1)).toBe('모래를 털면');
    expect(r.translations.get(2)).toBe('널 사랑해');
  });

  it('Gemini 변형: 탭 구분자', () => {
    const r = parse('1\t모래를 털면\t스나오 하라에바', true);
    expect(r.translations.get(1)).toBe('모래를 털면');
    expect(r.readings.get(1)).toBe('스나오 하라에바');
  });

  it('공백 줄 무시', () => {
    const r = parse('1|번역A\n\n  \n2|번역B', false);
    expect(r.translations.size).toBe(2);
  });

  it('앞뒤 공백 trim', () => {
    const r = parse('  1 | 모래를 털면 | 스나오 하라에바  ', true);
    expect(r.translations.get(1)).toBe('모래를 털면');
    expect(r.readings.get(1)).toBe('스나오 하라에바');
  });

  it('reading 모드에서 2칸 형식이면 번역만 파싱', () => {
    const r = parse('1|모래를 털면', true);
    // reading 패턴 매치 실패 → fallback으로 번역만
    expect(r.translations.get(1)).toBe('모래를 털면');
    expect(r.readings.has(1)).toBe(false);
  });
});
