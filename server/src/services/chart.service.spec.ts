import { DEFAULT_CHART_PLAYLISTS } from '../constants.js';
import { ChartService } from './chart.service.js';

describe('ChartService', () => {
  let service: ChartService;
  let mockChartRepo: { find: jest.Mock; count: jest.Mock; delete: jest.Mock; save: jest.Mock; create: jest.Mock };
  let mockYtdlp: { getPlaylistTracks: jest.Mock };
  let mockSettings: { get: jest.Mock; getBoolean: jest.Mock; getNumber: jest.Mock };

  beforeEach(() => {
    mockChartRepo = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      delete: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockImplementation((v) => Promise.resolve(v)),
      create: jest.fn().mockImplementation((v) => v),
    };
    mockYtdlp = { getPlaylistTracks: jest.fn().mockResolvedValue([]) };
    mockSettings = {
      get: jest.fn().mockReturnValue(''),
      getBoolean: jest.fn().mockReturnValue(true),
      getNumber: jest.fn().mockReturnValue(4),
    };
    service = new ChartService(mockChartRepo as never, mockYtdlp as never, mockSettings as never);
  });

  describe('getCategories', () => {
    it('플레이리스트별 카테고리 반환', async () => {
      const mockTracks = [{ id: '1', sourceId: 'vid1', title: 'Song', artist: 'Artist', rank: 1 }];
      mockChartRepo.find.mockResolvedValue(mockTracks);

      const categories = await service.getCategories();

      expect(categories.length).toBe(DEFAULT_CHART_PLAYLISTS.length);
      expect(categories[0].genre).toBe('kpop');
      expect(categories[0].label).toBe('한국');
      expect(categories[0].emoji).toBe('🇰🇷');
      expect(categories[0].tracks).toEqual(mockTracks);
    });

    it('빈 차트 → 빈 tracks 배열', async () => {
      mockChartRepo.find.mockResolvedValue([]);
      const categories = await service.getCategories();
      expect(categories.every((c) => c.tracks.length === 0)).toBe(true);
    });

    it('커스텀 플레이리스트 설정 사용', async () => {
      const custom = [{ id: 'PL_CUSTOM', genre: 'lofi', country: null, label: 'Custom', emoji: '☕' }];
      mockSettings.get.mockReturnValue(JSON.stringify(custom));
      mockChartRepo.find.mockResolvedValue([]);

      const categories = await service.getCategories();
      expect(categories.length).toBe(1);
      expect(categories[0].genre).toBe('lofi');
    });
  });

  describe('fetchAll', () => {
    it('각 플레이리스트에서 트랙 수집 + 저장', async () => {
      const tracks = [{ id: 'v1', title: 'T1', artist: 'A1', thumbnail: 'http://t' }];
      mockYtdlp.getPlaylistTracks.mockResolvedValue(tracks);

      await service.fetchAll();

      expect(mockYtdlp.getPlaylistTracks).toHaveBeenCalledTimes(DEFAULT_CHART_PLAYLISTS.length);
      expect(mockChartRepo.delete).toHaveBeenCalledTimes(DEFAULT_CHART_PLAYLISTS.length);
      expect(mockChartRepo.save).toHaveBeenCalledTimes(DEFAULT_CHART_PLAYLISTS.length);
    });

    it('빈 플레이리스트는 save 호출 안 함', async () => {
      mockYtdlp.getPlaylistTracks.mockResolvedValue([]);
      await service.fetchAll();
      expect(mockChartRepo.save).not.toHaveBeenCalled();
    });

    it('일부 플레이리스트 실패해도 나머지 계속 수집', async () => {
      let callCount = 0;
      mockYtdlp.getPlaylistTracks.mockImplementation(() => {
        callCount++;
        if (callCount === 1) throw new Error('network error');
        return Promise.resolve([{ id: 'v1', title: 'T', artist: 'A', thumbnail: '' }]);
      });

      await service.fetchAll();

      // 첫 번째 실패, 나머지는 성공
      expect(mockChartRepo.save).toHaveBeenCalledTimes(DEFAULT_CHART_PLAYLISTS.length - 1);
    });
  });

  describe('onModuleInit', () => {
    it('chart 비활성 시 수집 안 함', async () => {
      mockSettings.getBoolean.mockReturnValue(false);
      await service.onModuleInit();
      expect(mockYtdlp.getPlaylistTracks).not.toHaveBeenCalled();
    });

    it('데이터가 이미 있으면 수집 안 함', async () => {
      mockChartRepo.count.mockResolvedValue(100);
      await service.onModuleInit();
      expect(mockYtdlp.getPlaylistTracks).not.toHaveBeenCalled();
    });
  });
});
