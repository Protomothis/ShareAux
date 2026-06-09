import { IpBanService } from './ip-ban.service.js';

describe('IpBanService', () => {
  let service: IpBanService;
  let mockRepo: { find: jest.Mock; save: jest.Mock; create: jest.Mock; findOneBy: jest.Mock; delete: jest.Mock };

  beforeEach(() => {
    mockRepo = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((v) => Promise.resolve(v)),
      create: jest.fn().mockImplementation((v) => v),
      findOneBy: jest.fn(),
      delete: jest.fn(),
    };
    service = new IpBanService(mockRepo as never);
  });

  describe('isIpBanned', () => {
    it('캐시에 없는 IP → false', () => {
      expect(service.isIpBanned('1.2.3.4')).toBe(false);
    });

    it('만료되지 않은 ban → true', async () => {
      const future = new Date(Date.now() + 60_000);
      await service.banIp('1.2.3.4', 'test', 'admin', future);
      expect(service.isIpBanned('1.2.3.4')).toBe(true);
    });

    it('만료된 ban → false + 캐시 제거', async () => {
      const past = new Date(Date.now() - 1000);
      await service.banIp('1.2.3.4', 'test', 'admin', past);
      expect(service.isIpBanned('1.2.3.4')).toBe(false);
    });

    it('영구 ban (expiresAt=null) → true', async () => {
      await service.banIp('10.0.0.1', 'permanent', 'admin');
      expect(service.isIpBanned('10.0.0.1')).toBe(true);
    });
  });

  describe('banIp / unbanIp', () => {
    it('banIp → 캐시에 추가', async () => {
      await service.banIp('5.5.5.5', 'flood', 'system', new Date(Date.now() + 60_000));
      expect(service.isIpBanned('5.5.5.5')).toBe(true);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('unbanIp → 캐시에서 제거', async () => {
      mockRepo.findOneBy.mockResolvedValue({ id: 'uuid-1', ip: '5.5.5.5' });
      await service.banIp('5.5.5.5', 'flood', 'system');
      await service.unbanIp('uuid-1');
      expect(service.isIpBanned('5.5.5.5')).toBe(false);
      expect(mockRepo.delete).toHaveBeenCalledWith('uuid-1');
    });
  });

  describe('onModuleInit', () => {
    it('DB에서 ban 목록 로드', async () => {
      mockRepo.find.mockResolvedValue([
        { ip: '10.0.0.1', expiresAt: null },
        { ip: '10.0.0.2', expiresAt: new Date(Date.now() + 60_000) },
      ]);
      await service.onModuleInit();
      expect(service.isIpBanned('10.0.0.1')).toBe(true);
      expect(service.isIpBanned('10.0.0.2')).toBe(true);
    });
  });
});
