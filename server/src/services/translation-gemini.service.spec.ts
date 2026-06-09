import { TranslationGeminiService } from './translation-gemini.service';

// parseResponse는 private이므로 reflection으로 접근
function callParseResponse(text: string, includeReading: boolean) {
  const service = Object.create(TranslationGeminiService.prototype);
  return (service as any).parseResponse(text, includeReading);
}

describe('TranslationGeminiService', () => {
  describe('parseResponse — 번역만', () => {
    it('정상 포맷 (│ 구분자)', () => {
      const text = '1│사랑해\n2│떠나지 마\n3│너를 보낸다';
      const result = callParseResponse(text, false);
      expect(result.translations.get(1)).toBe('사랑해');
      expect(result.translations.get(2)).toBe('떠나지 마');
      expect(result.translations.get(3)).toBe('너를 보낸다');
      expect(result.translations.size).toBe(3);
    });

    it('공백 포함 포맷', () => {
      const text = ' 1 │ hello world \n 2 │ goodbye ';
      const result = callParseResponse(text, false);
      expect(result.translations.get(1)).toBe('hello world');
      expect(result.translations.get(2)).toBe('goodbye');
    });

    it('fallback 구분자 (파이프 |)', () => {
      const text = '1|사랑해\n2|보고싶다';
      const result = callParseResponse(text, false);
      expect(result.translations.get(1)).toBe('사랑해');
      expect(result.translations.get(2)).toBe('보고싶다');
    });

    it('fallback 구분자 (탭)', () => {
      const text = '1\t사랑해\n2\t보고싶다';
      const result = callParseResponse(text, false);
      expect(result.translations.get(1)).toBe('사랑해');
      expect(result.translations.get(2)).toBe('보고싶다');
    });

    it('빈 줄 무시', () => {
      const text = '1│hello\n\n\n2│world';
      const result = callParseResponse(text, false);
      expect(result.translations.size).toBe(2);
    });

    it('[주석] 줄 무시', () => {
      const text = '[Context provided]\n1│hello\n→ Note\n2│world';
      const result = callParseResponse(text, false);
      expect(result.translations.size).toBe(2);
    });

    it('번호 불연속', () => {
      const text = '3│세번째\n7│일곱번째';
      const result = callParseResponse(text, false);
      expect(result.translations.get(3)).toBe('세번째');
      expect(result.translations.get(7)).toBe('일곱번째');
      expect(result.translations.has(1)).toBe(false);
    });

    it('빈 문자열 입력', () => {
      const result = callParseResponse('', false);
      expect(result.translations.size).toBe(0);
    });

    it('파싱 불가능한 줄 무시', () => {
      const text = '이것은 잘못된 형식\n1│정상';
      const result = callParseResponse(text, false);
      expect(result.translations.size).toBe(1);
      expect(result.translations.get(1)).toBe('정상');
    });

    it('후행 구분자 제거', () => {
      const text = '1│사랑해│\n2│보고싶다/';
      const result = callParseResponse(text, false);
      expect(result.translations.get(1)).toBe('사랑해');
    });
  });

  describe('parseResponse — 번역 + 리딩', () => {
    it('정상 3컬럼 포맷', () => {
      const text = '1│사랑해│saranghae\n2│떠나지 마│tteonaji ma';
      const result = callParseResponse(text, true);
      expect(result.translations.get(1)).toBe('사랑해');
      expect(result.readings.get(1)).toBe('saranghae');
      expect(result.translations.get(2)).toBe('떠나지 마');
      expect(result.readings.get(2)).toBe('tteonaji ma');
    });

    it('리딩 없을 때 번역만 저장', () => {
      const text = '1│hello│\n2│world│reading';
      const result = callParseResponse(text, true);
      expect(result.translations.get(1)).toBe('hello');
      expect(result.readings.has(1)).toBe(false); // 빈 리딩
      expect(result.readings.get(2)).toBe('reading');
    });

    it('fallback 3컬럼 (파이프)', () => {
      const text = '1|번역|리딩\n2|second|reading2';
      const result = callParseResponse(text, true);
      expect(result.translations.get(1)).toBe('번역');
      expect(result.readings.get(1)).toBe('리딩');
    });

    it('2컬럼만 있으면 번역만 추출 (리딩 모드에서도)', () => {
      const text = '1│번역만있음';
      const result = callParseResponse(text, true);
      expect(result.translations.get(1)).toBe('번역만있음');
      expect(result.readings.has(1)).toBe(false);
    });

    it('일본어 리딩', () => {
      const text = '1│沈むように溶けてゆくように│shizumu you ni tokete yuku you ni';
      const result = callParseResponse(text, true);
      expect(result.translations.get(1)).toBe('沈むように溶けてゆくように');
      expect(result.readings.get(1)).toBe('shizumu you ni tokete yuku you ni');
    });
  });

  describe('checkDailyLimit', () => {
    it('한도 내이면 true', () => {
      const service = Object.create(TranslationGeminiService.prototype);
      (service as any).dailyCount = 5;
      (service as any).lastResetDate = new Date().toISOString().slice(0, 10);
      (service as any).settings = { getNumber: () => 200 };
      expect(service.checkDailyLimit()).toBe(true);
    });

    it('한도 초과면 false', () => {
      const service = Object.create(TranslationGeminiService.prototype);
      (service as any).dailyCount = 200;
      (service as any).lastResetDate = new Date().toISOString().slice(0, 10);
      (service as any).settings = { getNumber: () => 200 };
      expect(service.checkDailyLimit()).toBe(false);
    });

    it('날짜 바뀌면 카운트 리셋', () => {
      const service = Object.create(TranslationGeminiService.prototype);
      (service as any).dailyCount = 999;
      (service as any).lastResetDate = '2020-01-01';
      (service as any).settings = { getNumber: () => 200 };
      expect(service.checkDailyLimit()).toBe(true);
      expect((service as any).dailyCount).toBe(0);
    });
  });
});
