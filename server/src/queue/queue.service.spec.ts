import { AppException } from '../exceptions/app.exception.js';
import { ErrorCode } from '../types/error-code.enum.js';
import { QueueService } from './queue.service.js';

describe('QueueService', () => {
  let service: QueueService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let queueRepo: Record<string, any>;
  let trackRepo: Record<string, jest.Mock>;
  let permRepo: Record<string, jest.Mock>;
  let roomRepo: Record<string, jest.Mock>;
  let playHistoryRepo: Record<string, jest.Mock>;

  const roomId = 'room-1';
  const userId = 'user-1';
  const hostId = 'host-1';
  const trackId = 'track-1';

  const mockRoom = {
    id: roomId,
    hostId,
    enqueueWindowMin: 30,
    enqueueLimitPerWindow: 15,
    maxSelectPerAdd: 3,
    replayCooldownMin: 0,
  };

  beforeEach(() => {
    const mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getRawOne: jest.fn().mockResolvedValue({ max: 0 }),
      getRawMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };

    queueRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      findOneBy: jest.fn().mockResolvedValue(null),
      countBy: jest.fn().mockResolvedValue(0),
      save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'new-q', ...e })),
      create: jest.fn().mockImplementation((e) => e),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      manager: {
        findOne: jest.fn().mockResolvedValue(null),
        transaction: jest.fn().mockImplementation(async (cb: (em: unknown) => Promise<unknown>) => {
          const em = {
            findOne: jest.fn().mockResolvedValue({ id: 'q1', position: 1, version: 1 }),
            createQueryBuilder: jest.fn().mockReturnValue(mockQb),
            save: jest.fn().mockResolvedValue(undefined),
          };
          return cb(em);
        }),
      },
    };
    trackRepo = { findBy: jest.fn().mockResolvedValue([]), save: jest.fn(), create: jest.fn() };
    permRepo = { findOneBy: jest.fn().mockResolvedValue(null) };
    roomRepo = { findOneBy: jest.fn().mockResolvedValue(mockRoom) };
    playHistoryRepo = { createQueryBuilder: jest.fn() };

    service = new QueueService(
      queueRepo as never,
      trackRepo as never,
      permRepo as never,
      roomRepo as never,
      playHistoryRepo as never,
    );
  });

  describe('addTrack', () => {
    it('정상 추가', async () => {
      const result = await service.addTrack(roomId, trackId, userId);
      expect(queueRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('중복 sourceId 방지 (QUEUE_002)', async () => {
      queueRepo.findOneBy.mockResolvedValue({ id: 'existing' });
      await expect(service.addTrack(roomId, trackId, userId)).rejects.toThrow(AppException);
      await expect(service.addTrack(roomId, trackId, userId)).rejects.toMatchObject({
        errorCode: ErrorCode.QUEUE_002,
      });
    });

    it('큐 최대치 50 초과 (QUEUE_004)', async () => {
      queueRepo.countBy.mockResolvedValue(50);
      await expect(service.addTrack(roomId, trackId, userId)).rejects.toMatchObject({
        errorCode: ErrorCode.QUEUE_004,
      });
    });

    it('1인당 한도 초과 — window (QUEUE_005)', async () => {
      // 유저는 호스트가 아님
      const mockQb = queueRepo.createQueryBuilder();
      mockQb.getCount.mockResolvedValue(15); // enqueueLimitPerWindow = 15
      queueRepo.createQueryBuilder.mockReturnValue(mockQb);
      await expect(service.addTrack(roomId, trackId, userId)).rejects.toMatchObject({
        errorCode: ErrorCode.QUEUE_005,
      });
    });

    it('1인당 큐 아이템 10개 초과 (QUEUE_005)', async () => {
      queueRepo.countBy.mockImplementation((where: Record<string, unknown>) => {
        // 첫 번째 호출: total (played:false) → 0
        // 두 번째 호출: userCount → 10
        if (where.addedBy) return Promise.resolve(10);
        return Promise.resolve(0);
      });
      await expect(service.addTrack(roomId, trackId, userId)).rejects.toMatchObject({
        errorCode: ErrorCode.QUEUE_005,
      });
    });

    it('호스트는 한도 제한 없음', async () => {
      const mockQb = queueRepo.createQueryBuilder();
      mockQb.getCount.mockResolvedValue(20); // 한도 초과해도 괜찮음
      queueRepo.createQueryBuilder.mockReturnValue(mockQb);
      queueRepo.countBy.mockResolvedValue(0);
      const result = await service.addTrack(roomId, trackId, hostId);
      expect(result).toBeDefined();
    });

    it('position은 현재 max + 1', async () => {
      const mockQb = queueRepo.createQueryBuilder();
      mockQb.getRawOne.mockResolvedValue({ max: 5 });
      mockQb.getCount.mockResolvedValue(0);
      queueRepo.createQueryBuilder.mockReturnValue(mockQb);
      await service.addTrack(roomId, trackId, userId);
      expect(queueRepo.create).toHaveBeenCalledWith(expect.objectContaining({ position: 6 }));
    });
  });

  describe('removeTrack', () => {
    it('정상 삭제', async () => {
      queueRepo.findOne.mockResolvedValue({ id: 'q1', addedBy: { id: userId } });
      await service.removeTrack(roomId, 'q1', userId);
      expect(queueRepo.remove).toHaveBeenCalled();
    });

    it('존재하지 않는 큐 아이템 (QUEUE_001)', async () => {
      queueRepo.findOne.mockResolvedValue(null);
      await expect(service.removeTrack(roomId, 'q1', userId)).rejects.toMatchObject({
        errorCode: ErrorCode.QUEUE_001,
      });
    });

    it('본인 것만 삭제 가능 — 타인은 불가', async () => {
      queueRepo.findOne.mockResolvedValue({ id: 'q1', addedBy: { id: 'other-user' } });
      roomRepo.findOneBy.mockResolvedValue({ id: roomId, hostId });
      await expect(service.removeTrack(roomId, 'q1', userId)).rejects.toMatchObject({
        errorCode: ErrorCode.COMMON_001,
      });
    });

    it('호스트는 타인 것도 삭제 가능', async () => {
      queueRepo.findOne.mockResolvedValue({ id: 'q1', addedBy: { id: userId } });
      roomRepo.findOneBy.mockResolvedValue({ id: roomId, hostId });
      await service.removeTrack(roomId, 'q1', hostId);
      expect(queueRepo.remove).toHaveBeenCalled();
    });
  });

  describe('reorder', () => {
    it('정상 순서 변경 (앞→뒤)', async () => {
      await expect(service.reorder(roomId, 'q1', 3, 1)).resolves.not.toThrow();
    });

    it('정상 순서 변경 (뒤→앞)', async () => {
      const em = {
        findOne: jest.fn().mockResolvedValue({ id: 'q1', position: 5, version: 2 }),
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue(undefined),
        }),
        save: jest.fn().mockResolvedValue(undefined),
      };
      queueRepo.manager.transaction.mockImplementation(async (cb: (em: unknown) => Promise<unknown>) => cb(em));
      await expect(service.reorder(roomId, 'q1', 2, 2)).resolves.not.toThrow();
      expect(em.save).toHaveBeenCalledWith(expect.objectContaining({ position: 2, version: 3 }));
    });

    it('버전 불일치 시 (QUEUE_006)', async () => {
      const em = { findOne: jest.fn().mockResolvedValue(null) };
      queueRepo.manager.transaction.mockImplementation(async (cb: (em: unknown) => Promise<unknown>) => cb(em));
      await expect(service.reorder(roomId, 'q1', 3, 99)).rejects.toMatchObject({
        errorCode: ErrorCode.QUEUE_006,
      });
    });
  });
});
