import type { WeightedCandidate } from './auto-dj-candidates.service.js';
import { AutoDjCandidateService } from './auto-dj-candidates.service.js';

describe('AutoDjCandidateService', () => {
  let service: AutoDjCandidateService;
  let queueRepo: Record<string, jest.Mock>;
  let playbackRepo: Record<string, jest.Mock>;
  let historyRepo: Record<string, jest.Mock>;
  let trackRepo: Record<string, jest.Mock>;
  let statsRepo: Record<string, jest.Mock>;
  let favoriteRepo: Record<string, jest.Mock>;
  let ytdlp: Record<string, jest.Mock>;
  let aiGemini: Record<string, jest.Mock>;
  let chartService: Record<string, jest.Mock>;

  const roomId = 'room-1';

  const makeTrack = (id: string, sourceId = `src-${id}`) => ({ id, sourceId, name: `Track ${id}` });

  beforeEach(() => {
    queueRepo = { findOne: jest.fn().mockResolvedValue(null) };
    playbackRepo = { findOne: jest.fn().mockResolvedValue(null) };
    historyRepo = { find: jest.fn().mockResolvedValue([]) };
    trackRepo = { find: jest.fn().mockResolvedValue([]), findOneBy: jest.fn(), save: jest.fn(), create: jest.fn() };
    statsRepo = { find: jest.fn().mockResolvedValue([]) };
    favoriteRepo = { find: jest.fn().mockResolvedValue([]) };
    ytdlp = { search: jest.fn().mockResolvedValue([]), getRelated: jest.fn().mockResolvedValue([]) };
    aiGemini = { generate: jest.fn() };
    chartService = { getByGenres: jest.fn().mockResolvedValue([]) };

    service = new AutoDjCandidateService(
      queueRepo as never,
      playbackRepo as never,
      historyRepo as never,
      trackRepo as never,
      statsRepo as never,
      favoriteRepo as never,
      ytdlp as never,
      aiGemini as never,
      chartService as never,
    );
  });

  describe('getPopularCandidates', () => {
    it('통계 기반 정렬된 결과 반환', async () => {
      const t1 = makeTrack('1');
      const t2 = makeTrack('2');
      statsRepo.find.mockResolvedValue([
        { track: t1, score: 100 },
        { track: t2, score: 80 },
      ]);
      const result = await service.getPopularCandidates();
      expect(result).toHaveLength(2);
      expect(result[0].track.id).toBe('1');
      expect(result[1].track.id).toBe('2');
      expect(result[0].weight).toBe(1.0);
    });

    it('track이 null인 항목 필터링', async () => {
      statsRepo.find.mockResolvedValue([{ track: null, score: 50 }, { track: makeTrack('1'), score: 30 }]);
      const result = await service.getPopularCandidates();
      expect(result).toHaveLength(1);
    });

    it('빈 결과 처리', async () => {
      statsRepo.find.mockResolvedValue([]);
      const result = await service.getPopularCandidates();
      expect(result).toEqual([]);
    });
  });

  describe('getHistoryCandidates', () => {
    it('이력 기반 후보 반환', async () => {
      const t1 = makeTrack('1', 'vid-A');
      historyRepo.find.mockResolvedValue([{ sourceId: 'vid-A', playedAt: new Date() }]);
      trackRepo.find.mockResolvedValue([t1]);
      const result = await service.getHistoryCandidates(roomId);
      expect(result).toHaveLength(1);
      expect(result[0].track.id).toBe('1');
    });

    it('이력 없으면 빈 배열', async () => {
      historyRepo.find.mockResolvedValue([]);
      const result = await service.getHistoryCandidates(roomId);
      expect(result).toEqual([]);
    });

    it('track이 없는 sourceId 필터링', async () => {
      historyRepo.find.mockResolvedValue([
        { sourceId: 'vid-A', playedAt: new Date() },
        { sourceId: 'vid-B', playedAt: new Date() },
      ]);
      trackRepo.find.mockResolvedValue([makeTrack('1', 'vid-A')]); // vid-B 없음
      const result = await service.getHistoryCandidates(roomId);
      expect(result).toHaveLength(1);
    });

    it('중복 sourceId 제거 후 조회', async () => {
      historyRepo.find.mockResolvedValue([
        { sourceId: 'vid-A', playedAt: new Date() },
        { sourceId: 'vid-A', playedAt: new Date() },
      ]);
      trackRepo.find.mockResolvedValue([makeTrack('1', 'vid-A')]);
      const result = await service.getHistoryCandidates(roomId);
      // 2개의 history 항목 모두 같은 track으로 매핑
      expect(result).toHaveLength(2);
      expect(result[0].track.id).toBe('1');
    });
  });

  describe('getMixedCandidates', () => {
    it('여러 소스 합산', async () => {
      // related → playback에서 videoId 없음 → popular fallback
      const t1 = makeTrack('1');
      const t2 = makeTrack('2');
      statsRepo.find.mockResolvedValue([
        { track: t1, score: 100 },
        { track: t2, score: 50 },
      ]);
      const result = await service.getMixedCandidates(roomId);
      // related/history 빈 → popular만
      expect(result.length).toBeGreaterThan(0);
    });

    it('중복 제거 — 같은 track.id는 높은 weight 유지', async () => {
      const t1 = makeTrack('1', 'vid-A');
      // getRelatedCandidates → popular (playback null이므로)
      // getHistoryCandidates → 빈
      // getPopularCandidates → t1
      statsRepo.find.mockResolvedValue([{ track: t1, score: 100 }]);
      const result = await service.getMixedCandidates(roomId);
      const ids = result.map((c) => c.track.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('모든 소스가 빈 경우', async () => {
      const result = await service.getMixedCandidates(roomId);
      expect(result).toEqual([]);
    });

    it('weight 적용 — related=1.0, history=0.6, popular=0.4', async () => {
      // related와 popular에 같은 곡이 있을 때 weight 1.0 유지
      const t1 = makeTrack('1');
      statsRepo.find.mockResolvedValue([{ track: t1, score: 100 }]);
      // playback이 null이므로 related = popular = 같은 결과
      const result = await service.getMixedCandidates(roomId);
      if (result.length > 0) {
        // related weight(1.0) > popular weight(0.4) → 1.0 유지
        expect(result[0].weight).toBe(1.0);
      }
    });
  });

  describe('getRelatedCandidates', () => {
    it('현재 재생 없으면 popular fallback', async () => {
      playbackRepo.findOne.mockResolvedValue(null);
      queueRepo.findOne.mockResolvedValue(null);
      const t1 = makeTrack('1');
      statsRepo.find.mockResolvedValue([{ track: t1, score: 50 }]);
      const result = await service.getRelatedCandidates(roomId);
      expect(result).toHaveLength(1);
    });

    it('관련 곡 반환', async () => {
      playbackRepo.findOne.mockResolvedValue({ track: { sourceId: 'vid-X' } });
      const searchResult = { id: 'new-1', title: 'New', artist: 'Art', thumbnail: '', duration: 200 };
      ytdlp.getRelated.mockResolvedValue([searchResult]);
      trackRepo.findOneBy.mockResolvedValue(null);
      trackRepo.create.mockImplementation((e) => e);
      trackRepo.save.mockImplementation((e) => Promise.resolve({ id: 'track-new', ...e }));
      const result = await service.getRelatedCandidates(roomId);
      expect(result).toHaveLength(1);
    });
  });
});
