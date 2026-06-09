import { OptionKey } from '../types/settings.types.js';
import { SettingsService } from './settings.service.js';

describe('SettingsService', () => {
  let service: SettingsService;
  let mockRepo: { find: jest.Mock; upsert: jest.Mock };
  let mockConfig: { get: jest.Mock };

  beforeEach(() => {
    mockRepo = {
      find: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue(undefined),
    };
    mockConfig = { get: jest.fn().mockReturnValue('test-jwt-secret') };
    service = new SettingsService(mockRepo as never, mockConfig as never);
    // 직접 캐시 조작을 위해 내부 접근 (onModuleInit 없이 테스트)
  });

  describe('get()', () => {
    it('캐시에 값이 있으면 반환', async () => {
      mockRepo.upsert.mockResolvedValue(undefined);
      // set을 통해 캐시에 값 넣기
      await service.set(OptionKey.RoomMaxMembers, '50');
      expect(service.get(OptionKey.RoomMaxMembers)).toBe('50');
    });

    it('캐시 미스 → OPTION_METAS 기본값 반환', () => {
      expect(service.get(OptionKey.RoomMaxMembers)).toBe('20');
    });

    it('캐시 미스 + 알 수 없는 키 → fallback 반환', () => {
      expect(service.get('unknown.key', 'fallback')).toBe('fallback');
    });

    it('캐시 미스 + 알 수 없는 키 + fallback 없음 → 빈 문자열', () => {
      expect(service.get('unknown.key')).toBe('');
    });
  });

  describe('getNumber()', () => {
    it('캐시된 문자열 → 숫자 변환', async () => {
      await service.set(OptionKey.RoomMaxMembers, '42');
      expect(service.getNumber(OptionKey.RoomMaxMembers)).toBe(42);
    });

    it('캐시 미스 → 기본값 숫자', () => {
      expect(service.getNumber(OptionKey.RoomMaxMembers)).toBe(20);
    });

    it('NaN 값 → NaN 반환 (Number("abc"))', async () => {
      await service.set(OptionKey.RoomMaxMembers, 'abc');
      expect(service.getNumber(OptionKey.RoomMaxMembers)).toBeNaN();
    });
  });

  describe('getBoolean()', () => {
    it('"true" → true', async () => {
      await service.set(OptionKey.AuthGuestEnabled, 'true');
      expect(service.getBoolean(OptionKey.AuthGuestEnabled)).toBe(true);
    });

    it('"false" → false', async () => {
      await service.set(OptionKey.AuthGuestEnabled, 'false');
      expect(service.getBoolean(OptionKey.AuthGuestEnabled)).toBe(false);
    });

    it('캐시 미스 → 기본값 (OPTION_METAS)', () => {
      // AuthGuestEnabled 기본값 = 'true'
      expect(service.getBoolean(OptionKey.AuthGuestEnabled)).toBe(true);
    });

    it('알 수 없는 키 + fallback', () => {
      expect(service.getBoolean('unknown.key', true)).toBe(true);
    });
  });

  describe('set()', () => {
    it('캐시에 평문 저장', async () => {
      await service.set(OptionKey.QueueMaxPerUser, '15');
      expect(service.get(OptionKey.QueueMaxPerUser)).toBe('15');
      expect(mockRepo.upsert).toHaveBeenCalledWith(
        { key: OptionKey.QueueMaxPerUser, value: '15', description: null },
        ['key'],
      );
    });
  });
});
