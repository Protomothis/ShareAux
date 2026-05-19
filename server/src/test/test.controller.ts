import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthService } from '../auth/auth.service.js';
import { Room } from '../entities/room.entity.js';
import { User } from '../entities/user.entity.js';
import { PlayerService } from '../player/player.service.js';
import { PushService } from '../push/push.service.js';
import { QueueService } from '../queue/queue.service.js';
import { RoomsGateway } from '../rooms/rooms.gateway.js';
import { RoomsService } from '../rooms/rooms.service.js';
import { AuthProvider } from '../types/auth-provider.enum.js';
import { Provider } from '../types/provider.enum.js';
import { UserRole } from '../types/user-role.enum.js';
import { TranslationService } from '../services/translation.service.js';

const NCS_TRACKS = [
  {
    provider: Provider.YT,
    sourceId: 'TW9d8vYrVFQ',
    name: 'Elektronomia — Sky High',
    artist: 'Elektronomia',
    thumbnail: 'https://i.ytimg.com/vi/TW9d8vYrVFQ/hqdefault.jpg',
    durationMs: 283000,
  },
  {
    provider: Provider.YT,
    sourceId: 'J2X5mJ3HDYE',
    name: 'DEAF KEV — Invincible',
    artist: 'DEAF KEV',
    thumbnail: 'https://i.ytimg.com/vi/J2X5mJ3HDYE/hqdefault.jpg',
    durationMs: 253000,
  },
  {
    provider: Provider.YT,
    sourceId: 'K4DyBUG242c',
    name: 'Cartoon — On & On',
    artist: 'Cartoon ft. Daniel Levi',
    thumbnail: 'https://i.ytimg.com/vi/K4DyBUG242c/hqdefault.jpg',
    durationMs: 208000,
  },
  {
    provider: Provider.YT,
    sourceId: '__CRWE-L45k',
    name: 'Tobu — Candyland',
    artist: 'Tobu',
    thumbnail: 'https://i.ytimg.com/vi/__CRWE-L45k/hqdefault.jpg',
    durationMs: 219000,
  },
  {
    provider: Provider.YT,
    sourceId: 'n1WpP7iowLc',
    name: 'Elektronomia — Energy',
    artist: 'Elektronomia',
    thumbnail: 'https://i.ytimg.com/vi/n1WpP7iowLc/hqdefault.jpg',
    durationMs: 221000,
  },
];

const DEMO_USERS = ['Alex', 'Mina', 'Jay', 'Sora', 'Haru'];

/** 개발 환경 전용 테스트 엔드포인트 */
@ApiExcludeController()
@Controller('test')
export class TestController {
  private readonly logger = new Logger(TestController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly pushService: PushService,
    private readonly config: ConfigService,
    private readonly rooms: RoomsService,
    private readonly player: PlayerService,
    private readonly queue: QueueService,
    private readonly gateway: RoomsGateway,
    private readonly translation: TranslationService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
  ) {}

  /** superAdmin JWT 토큰 발급 */
  @Get('token')
  async getToken() {
    const admin = await this.userRepo.findOneBy({ role: UserRole.SuperAdmin });
    if (!admin) return { error: 'No superAdmin user found' };
    const tokens = this.auth.generateTokens(admin);
    return { userId: admin.id, nickname: admin.nickname, ...tokens };
  }

  /** 데모 방 생성 */
  @Get('demo/room')
  async demoRoom() {
    const admin = await this.userRepo.findOneBy({ role: UserRole.SuperAdmin });
    if (!admin) return { error: 'No superAdmin user found' };

    let room = await this.roomRepo.findOneBy({ name: '🎵 Demo Room' });
    if (!room) {
      room = await this.rooms.create(admin.id, { name: '🎵 Demo Room' });
    }
    await this.rooms.addMember(room.id, admin.id);
    return { roomId: room.id, hostId: admin.id };
  }

  /** 데모 유저 생성 + 방 멤버 추가 */
  @Get('demo/users')
  async demoUsers(@Query('roomId') roomId: string) {
    if (!roomId) return { error: 'roomId required' };
    const users: { id: string; nickname: string }[] = [];
    for (const name of DEMO_USERS) {
      let user = await this.userRepo.findOneBy({ nickname: name });
      if (!user) {
        user = this.userRepo.create({
          nickname: name,
          provider: AuthProvider.Invite,
          username: null,
          passwordHash: null,
          googleId: null,
          email: null,
        });
        user = await this.userRepo.save(user);
      }
      await this.rooms.addMember(roomId, user.id).catch(() => {});
      users.push({ id: user.id, nickname: user.nickname });
    }
    return { ok: true, users };
  }

  /** 데모 큐에 NCS 곡 추가 */
  @Get('demo/queue')
  async demoQueue(@Query('roomId') roomId: string, @Query('count') count?: string) {
    if (!roomId) return { error: 'roomId required' };
    const admin = await this.userRepo.findOneBy({ role: UserRole.SuperAdmin });
    if (!admin) return { error: 'No superAdmin user found' };
    const n = Math.min(parseInt(count || '3', 10), NCS_TRACKS.length);
    try {
      await this.queue.addTracks(roomId, NCS_TRACKS.slice(0, n), admin.id);
    } catch {
      /* 데모용 — 실패 무시 */
    }
    return { ok: true, added: n };
  }

  /** 데모 재생 시작 */
  @Get('demo/play')
  async demoPlay(@Query('roomId') roomId: string) {
    if (!roomId) return { error: 'roomId required' };
    const status = await this.player.getStatus(roomId);
    if (status?.streamState === 'streaming') return { ok: true, action: 'already playing' };
    try {
      await this.player.skip(roomId);
    } catch {
      /* 데모용 — 실패 무시 */
    }
    return { ok: true };
  }

  /** 데모 채팅 1개 삽입 (WS 브로드캐스트) */
  @Get('demo/chat')
  async demoChat(
    @Query('roomId') roomId: string,
    @Query('nickname') nickname?: string,
    @Query('message') message?: string,
  ) {
    if (!roomId) return { error: 'roomId required' };
    if (!nickname || !message) return { error: 'nickname, message required' };
    this.gateway.broadcastChatMessage(roomId, nickname, message);
    return { ok: true };
  }

  /** 테스트 Push 발송 */
  @Get('push')
  async testPush() {
    const admin = await this.userRepo.findOneBy({ role: UserRole.SuperAdmin });
    if (!admin) return { error: 'No superAdmin user found' };
    await this.pushService.sendTestPush(admin.id);
    return { ok: true, userId: admin.id };
  }

  /**
   * 번역 프롬프트 테스트 — 샘플 가사로 Gemini 호출 후 결과 반환
   * GET /api/test/translate?lang=ja&target=ko&lines=5
   * GET /api/test/translate?lrc=<LRC 텍스트 URL-encoded>
   */
  @Get('translate')
  async testTranslate(
    @Query('lang') lang?: string,
    @Query('target') target?: string,
    @Query('lines') lines?: string,
    @Query('lrc') lrc?: string,
  ) {
    if (!this.translation.isEnabled) return { error: 'Translation not enabled (no Gemini API key)' };

    const sampleLrc = lrc ?? this.getSampleLrc(lang ?? 'ja', parseInt(lines ?? '8', 10));

    // TranslationService의 private 메서드에 접근하기 위해 prototype 사용
    const svc = this.translation as unknown as Record<string, (...args: unknown[]) => unknown>;
    const parseLrc = svc.parseLrc.bind(this.translation) as (lrc: string) => Array<{ time: string; text: string }>;
    const translateWithChunks = svc.translateWithChunks.bind(this.translation) as (
      lines: Array<{ time: string; text: string }>,
      lang: string,
      targetLang: string,
      includeReading: boolean,
    ) => Promise<{ translations: Map<number, string>; readings: Map<number, string> } | null>;

    const parsed = parseLrc(sampleLrc);
    if (!parsed.length) return { error: 'No lyrics lines parsed', input: sampleLrc };

    const sourceLang = lang ?? 'ja';
    const targetLang = target ?? 'ko';
    const includeReading = sourceLang === 'ja' && (targetLang === 'ko' || targetLang === 'en');

    const start = Date.now();
    const result = await translateWithChunks(parsed, sourceLang, targetLang, includeReading);
    const elapsed = Date.now() - start;

    if (!result) return { error: 'Translation failed', elapsed };

    const output = parsed.map((l, i) => ({
      line: i + 1,
      original: l.text,
      translated: result.translations.get(i + 1) ?? '(missing)',
      ...(includeReading ? { reading: result.readings.get(i + 1) ?? '(missing)' } : {}),
    }));

    return {
      ok: true,
      elapsed,
      sourceLang,
      targetLang,
      includeReading,
      totalLines: parsed.length,
      translatedLines: result.translations.size,
      missingLines: parsed.length - result.translations.size,
      output,
    };
  }

  private getSampleLrc(lang: string, count: number): string {
    const samples: Record<string, string[]> = {
      ja: [
        '[00:15.00] 夜に駆ける',
        '[00:18.00] 沈むように溶けてゆくように',
        '[00:22.00] 二人だけの空が広がる夜に',
        '[00:26.00] さよならだけだった',
        '[00:30.00] その一言で全てが分かった',
        '[00:34.00] 日が沈み出した空と君の姿',
        '[00:38.00] フェンス越しに重なっていた',
        '[00:42.00] 初めて会った日から',
        '[00:45.00] 僕の心の全てを奪った',
        '[00:49.00] どこか儚い空気を纏う君は',
        '[00:53.00] 寂しい目をしてたんだ',
        '[00:57.00] いつだってチックタックと鳴る世界で何度だってさ',
      ],
      en: [
        "[00:10.00] Is it me you're looking for?",
        '[00:14.00] I can see it in your eyes',
        '[00:18.00] I can see it in your smile',
        "[00:22.00] You're all I've ever wanted",
        '[00:26.00] And my arms are open wide',
        "[00:30.00] 'Cause you know just what to say",
        '[00:34.00] And you know just what to do',
        '[00:38.00] And I want to tell you so much',
        '[00:42.00] I love you',
        '[00:45.00] Oh yeah',
        "[00:48.00] I've been alone with you inside my mind",
        "[00:52.00] And in my dreams I've kissed your lips a thousand times",
      ],
      zh: [
        '[00:10.00] 我们一起学猫叫',
        '[00:14.00] 一起喵喵喵喵喵',
        '[00:18.00] 在你面前撒个娇',
        '[00:22.00] 哎呦喵喵喵喵喵',
        '[00:26.00] 我的心脏砰砰跳',
        '[00:30.00] 迷恋上你的坏笑',
        '[00:34.00] 你不说爱我我就喵喵喵',
        '[00:38.00] 每天都需要你的拥抱',
      ],
    };
    const lrcLines = samples[lang] ?? samples['ja'];
    return lrcLines.slice(0, Math.min(count, lrcLines.length)).join('\n');
  }
}
