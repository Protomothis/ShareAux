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
}
