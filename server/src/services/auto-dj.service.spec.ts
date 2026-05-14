import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PlayHistory } from '../entities/play-history.entity';
import { Room } from '../entities/room.entity';
import { RoomPlayback } from '../entities/room-playback.entity';
import { RoomQueue } from '../entities/room-queue.entity';
import { Track } from '../entities/track.entity';
import { TrackStats } from '../entities/track-stats.entity';
import { UserFavorite } from '../entities/user-favorite.entity';
import { AiDjGeminiService } from './ai-dj-gemini.service';
import { AutoDjService } from './auto-dj.service';
import { SettingsService } from './settings.service';
import { YtdlpService } from './ytdlp.service';

const mockRepo = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  findOneBy: jest.fn().mockResolvedValue(null),
  countBy: jest.fn().mockResolvedValue(0),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ max: 0 }),
  }),
});

describe('AutoDjService', () => {
  let service: AutoDjService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AutoDjService,
        { provide: getRepositoryToken(Room), useFactory: mockRepo },
        { provide: getRepositoryToken(RoomQueue), useFactory: mockRepo },
        { provide: getRepositoryToken(RoomPlayback), useFactory: mockRepo },
        { provide: getRepositoryToken(PlayHistory), useFactory: mockRepo },
        { provide: getRepositoryToken(Track), useFactory: mockRepo },
        { provide: getRepositoryToken(TrackStats), useFactory: mockRepo },
        { provide: getRepositoryToken(UserFavorite), useFactory: mockRepo },
        { provide: YtdlpService, useValue: {} },
        { provide: SettingsService, useValue: { getNumber: () => 15, get: () => '', getSecret: () => '' } },
        { provide: AiDjGeminiService, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(AutoDjService);
  });

  describe('weightedRandom', () => {
    it('빈 배열이면 null 반환', () => {
      expect(service.weightedRandom([])).toBeNull();
    });

    it('단일 후보면 해당 후보 반환', () => {
      const candidate = { track: { id: '1' } as Track, weight: 1 };
      expect(service.weightedRandom([candidate])).toBe(candidate);
    });

    it('weight 0인 후보는 선택되지 않음', () => {
      const zero = { track: { id: '1' } as Track, weight: 0 };
      const one = { track: { id: '2' } as Track, weight: 1 };
      // 100번 반복해도 zero가 선택되지 않아야 함
      for (let i = 0; i < 100; i++) {
        expect(service.weightedRandom([zero, one])).toBe(one);
      }
    });

    it('높은 weight가 더 자주 선택됨', () => {
      const low = { track: { id: '1' } as Track, weight: 1 };
      const high = { track: { id: '2' } as Track, weight: 99 };
      let highCount = 0;
      for (let i = 0; i < 1000; i++) {
        if (service.weightedRandom([low, high]) === high) highCount++;
      }
      // 99% weight → 최소 90% 이상 선택
      expect(highCount).toBeGreaterThan(900);
    });
  });
});
