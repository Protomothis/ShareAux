import { cleanArtist, extractTitle, smartClean } from './title-cleaner.js';

describe('title-cleaner', () => {
  describe('smartClean', () => {
    it('괄호 안 노이즈 제거', () => {
      expect(smartClean('IU - Blueming (Official Music Video)')).toBe('IU - Blueming');
    });

    it('feat. 이후 제거', () => {
      expect(smartClean('Song Title feat. Someone')).toBe('Song Title');
    });

    it('한국어 노이즈 제거', () => {
      expect(smartClean('아이유 - 블루밍 [가사/lyrics]')).toBe('아이유 - 블루밍');
    });

    it('THE FIRST TAKE 제거', () => {
      expect(smartClean('Ado - 踊 / THE FIRST TAKE')).toBe('Ado - 踊');
    });

    it('따옴표 안 제목 보존', () => {
      expect(smartClean("YOASOBI '夜に駆ける' Official Music Video")).toContain('夜に駆ける');
    });

    it('빈 문자열 처리', () => {
      expect(smartClean('')).toBe('');
    });

    it('일본어 제목 — 【MV】 제거', () => {
      expect(smartClean('米津玄師 - Lemon【MV】')).toBe('米津玄師 - Lemon');
    });

    it('중국어 제목 — (官方MV) 제거', () => {
      const result = smartClean('周杰伦 Jay Chou (官方MV)');
      expect(result).not.toContain('官方');
      expect(result).not.toContain('MV');
      expect(result).toContain('周杰伦');
    });

    it('MV/PV 접미사 제거', () => {
      expect(smartClean('YOASOBI - アイドル MV')).toBe('YOASOBI - アイドル');
    });

    it('복합 노이즈 — 괄호 + 대괄호 + feat', () => {
      const result = smartClean('Artist - Title (Official MV) [4K] feat. Someone');
      expect(result).toBe('Artist - Title');
    });

    it('특수문자 — 《》 괄호 제거', () => {
      const result = smartClean('Title《Something》');
      expect(result).not.toContain('《');
      expect(result).not.toContain('》');
      expect(result).toBe('Title');
    });
  });

  describe('extractTitle', () => {
    it('아티스트 - 제목 패턴에서 제목 추출', () => {
      expect(extractTitle('IU - Blueming')).toBe('Blueming');
    });

    it('구분자 없으면 전체 반환', () => {
      expect(extractTitle('Blueming')).toBe('Blueming');
    });

    it('제목 내부 하이픈 보존', () => {
      expect(extractTitle('BTS - Boy With Luv')).toBe('Boy With Luv');
    });

    it('따옴표 안 제목 우선', () => {
      expect(extractTitle("YOASOBI '夜に駆ける'")).toBe('夜に駆ける');
    });
  });

  describe('cleanArtist', () => {
    it('레이블명 제거', () => {
      expect(cleanArtist('IU Stone Music Entertainment')).toBe('IU');
    });

    it('VEVO 제거', () => {
      expect(cleanArtist('IUVEVO')).toBe('IU');
    });

    it('슬래시 이후 제거', () => {
      expect(cleanArtist('IU / Topic')).toBe('IU');
    });
  });
});
