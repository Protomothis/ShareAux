import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { IncomingMessage, Server as HttpServer } from 'http';
import type { Duplex } from 'stream';
import { WebSocket, WebSocketServer } from 'ws';

import { AuthService } from '../auth/auth.service.js';
import { AudioService } from '../services/audio.service.js';
import { ChatMuteService } from '../services/chat-mute.service.js';
import { IpBanService } from '../services/ip-ban.service.js';
import {
  AUTH_COOKIE_ACCESS,
  WS_CLOSE_BANNED,
  WS_CLOSE_DUPLICATE_SESSION,
  WS_CLOSE_JOINED_OTHER_ROOM,
  WS_CLOSE_KICKED,
  WS_CLOSE_ROOM_GONE,
  WS_GRACE_MS,
  WS_HEARTBEAT_INTERVAL_MS,
} from '../constants.js';
import type { ChatHistoryEntry, JwtPayload, WsClient } from '../types/index.js';
import { Permission, WsEvent, WsOpCode } from '../types/index.js';
import { RoomsService } from './rooms.service.js';

@Injectable()
export class RoomsGateway {
  private readonly logger = new Logger(RoomsGateway.name);
  private roomClients = new Map<string, Set<WsClient>>();
  private chatHistory = new Map<string, ChatHistoryEntry[]>();
  private lastHeartbeat = new Map<string, number>();
  private pendingDisconnects = new Map<string, ReturnType<typeof setTimeout>>();
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private wss?: WebSocketServer;

  constructor(
    private jwt: JwtService,
    private audio: AudioService,
    private chatMute: ChatMuteService,
    private rooms: RoomsService,
    private config: ConfigService,
    private ipBan: IpBanService,
    @Inject(forwardRef(() => AuthService)) private auth: AuthService,
  ) {}

  attachToServer(httpServer: HttpServer): void {
    this.wss = new WebSocketServer({ noServer: true });

    const allowedOrigin = this.config.get<string>('CLIENT_URL');

    // WS pre-auth flood 방어: IP별 연결 시도 추적
    const connectAttempts = new Map<string, { count: number; resetAt: number; violations: number }>();
    const WS_RATE_WINDOW_MS = 10_000;
    const WS_RATE_LIMIT = 10;

    httpServer.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      if (req.url?.split('?')[0] !== '/ws') {
        socket.destroy();
        return;
      }

      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? '';

      // IP ban 체크
      if (this.ipBan.isIpBanned(ip)) {
        socket.destroy();
        return;
      }

      // CSWSH 방지: Origin 헤더 검증
      const origin = req.headers.origin;
      if (allowedOrigin && origin && !origin.startsWith(allowedOrigin)) {
        this.logger.warn(`WS upgrade rejected: origin=${origin} (allowed=${allowedOrigin})`);
        socket.destroy();
        return;
      }

      // Rate limit (인증된 유저는 쿠키로 판별하여 bypass)
      const hasCookie = !!req.headers.cookie?.includes('sat=');
      if (!hasCookie) {
        const now = Date.now();
        let entry = connectAttempts.get(ip);
        if (!entry || now > entry.resetAt) {
          entry = { count: 0, resetAt: now + WS_RATE_WINDOW_MS, violations: entry?.violations ?? 0 };
          connectAttempts.set(ip, entry);
        }
        entry.count++;

        if (entry.count > WS_RATE_LIMIT) {
          entry.violations++;
          this.logger.warn(`WS flood: ip=${ip} count=${entry.count} violations=${entry.violations}`);

          // 에스컬레이션: 3회 위반 → 30분 ban, 10회 → 24시간 ban
          if (entry.violations >= 10) {
            void this.ipBan.banIp(ip, 'WS flood (auto)', 'system', new Date(now + 24 * 60 * 60_000));
          } else if (entry.violations >= 3) {
            void this.ipBan.banIp(ip, 'WS flood (auto)', 'system', new Date(now + 30 * 60_000));
          }

          socket.destroy();
          return;
        }
      }

      this.wss!.handleUpgrade(req, socket, head, (client) => {
        void this.handleConnection(client as WsClient, req);
      });
    });

    // 60초마다 하트비트 체크 — 세션 만료된 유저 정리
    this.heartbeatInterval = setInterval(() => this.checkHeartbeats(), WS_HEARTBEAT_INTERVAL_MS);
    this.logger.log('WebSocket server attached at /ws');
  }

  private async checkHeartbeats(): Promise<void> {
    const now = Date.now();
    for (const [roomId, clients] of this.roomClients) {
      for (const c of clients) {
        if (!c.data) continue;
        const key = `${c.data.userId}:${roomId}`;
        const last = this.lastHeartbeat.get(key) ?? 0;
        if (now - last < 60_000) continue;

        // 하트비트 만료 → 세션 종료
        this.logger.log(`Heartbeat timeout: ${c.data.nickname} in room ${roomId}`);
        this.lastHeartbeat.delete(key);
        this.audio.removeListener(roomId, c.data.audioCallback);
        clients.delete(c);
        c.close(4002, 'Heartbeat timeout');

        // pending grace가 있으면 취소 (heartbeat timeout이 우선)
        const pendingKey = `${c.data.userId}:${roomId}`;
        clearTimeout(this.pendingDisconnects.get(pendingKey));
        this.pendingDisconnects.delete(pendingKey);

        await this.finalizeDisconnect(roomId, c.data.userId, c.data.nickname);
      }
      if (!clients.size) this.roomClients.delete(roomId);
    }
  }

  private async handleConnection(client: WsClient, req: IncomingMessage): Promise<void> {
    try {
      const params = new URLSearchParams(req.url?.split('?')[1] ?? '');
      const roomId = params.get('roomId');
      // 쿠키 → query param 순서로 토큰 추출
      const cookieToken = req.headers.cookie
        ?.split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${AUTH_COOKIE_ACCESS}=`))
        ?.split('=')[1];
      const token = cookieToken ?? params.get('token');

      if (!token || !roomId) {
        client.close(4001, 'Missing token or roomId');
        return;
      }

      let payload: JwtPayload;
      try {
        payload = this.jwt.verify<JwtPayload>(token);
      } catch {
        client.close(4001, 'Invalid token');
        return;
      }

      const userId = payload.sub;
      const nickname = payload.nickname || userId.slice(0, 8);

      // 밴 체크
      const user = await this.auth.findUserById(userId);
      if (user?.bannedAt) {
        client.close(WS_CLOSE_BANNED, 'Banned');
        return;
      }

      const audioCallback = (frame: Buffer) => {
        if (client.readyState !== WebSocket.OPEN) return;
        try {
          const buf = Buffer.alloc(1 + frame.length);
          buf[0] = WsOpCode.Audio;
          frame.copy(buf, 1);
          client.send(buf);
        } catch {
          // WS send 실패 → synced 해제하여 다음 moof에서 init segment 재전송
          this.audio.unsyncListener(client.data?.roomId ?? '', audioCallback);
        }
      };

      const { permissions: perms } = await this.rooms.getEffectivePermissions(roomId, userId);

      // 방 활성 여부 체크
      const isActive = await this.rooms.isRoomActive(roomId);
      if (!isActive) {
        client.close(WS_CLOSE_ROOM_GONE, 'Room not found or inactive');
        return;
      }

      client.data = { userId, roomId, audioCallback, nickname, role: payload.role ?? 'user', permissions: perms };

      if (!this.roomClients.has(roomId)) this.roomClients.set(roomId, new Set());

      // grace period 중 재연결 → pending 취소, 입장 메시지 억제
      const pendingKey = `${userId}:${roomId}`;
      const wasReconnect = this.pendingDisconnects.has(pendingKey);
      if (wasReconnect) {
        clearTimeout(this.pendingDisconnects.get(pendingKey));
        this.pendingDisconnects.delete(pendingKey);
        this.logger.log(`Reconnect within grace period: ${nickname} in room ${roomId}`);
      }

      // 다른 방에 있는 같은 유저의 연결 정리 (1인 1방)
      for (const [otherRoomId, clients] of this.roomClients.entries()) {
        if (otherRoomId === roomId) continue;
        for (const old of clients) {
          if (old.data?.userId === userId) {
            this.audio.removeListener(otherRoomId, old.data.audioCallback);
            old.close(WS_CLOSE_JOINED_OTHER_ROOM, 'Joined another room');
            clients.delete(old);
          }
        }
      }

      // 같은 유저의 이전 연결 정리 (중복 세션)
      const existing = this.roomClients.get(roomId)!;
      for (const old of existing) {
        if (old.data?.userId === userId && old !== client) {
          this.audio.removeListener(roomId, old.data.audioCallback);
          old.close(WS_CLOSE_DUPLICATE_SESSION, 'Duplicate session');
          existing.delete(old);
        }
      }
      existing.add(client);

      this.audio.addListener(roomId, audioCallback);
      this.lastHeartbeat.set(`${userId}:${roomId}`, Date.now());

      client.on('message', (raw: Buffer | string) => {
        if (!client.data) return;
        const data = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        if (data.length < 1) return;
        if (data[0] === WsOpCode.Chat && data.length > 1) {
          if (!client.data.permissions.includes(Permission.Chat)) return;
          try {
            const parsed = JSON.parse(data.subarray(1).toString());
            // 메시지 길이 제한
            if (!parsed.message || typeof parsed.message !== 'string' || parsed.message.length > 300) return;
            const trimmed = parsed.message.trim().replace(/[<>]/g, '');
            if (!trimmed) return;

            const { userId, roomId: rid } = client.data;

            // mute 체크
            const mutedSec = this.chatMute.isMuted(rid, userId);
            if (mutedSec > 0) {
              this.sendToUser(rid, userId, WsEvent.ChatMuted, `채팅이 제한되었습니다 (${mutedSec}초 후 해제)`);
              return;
            }

            // 레이트 리밋 (1초에 1개)
            const rateKey = `chat:${userId}`;
            const lastChat = this.lastHeartbeat.get(rateKey) ?? 0;
            if (Date.now() - lastChat < 1000) return;
            this.lastHeartbeat.set(rateKey, Date.now());

            // admin/superAdmin은 자동 mute 면제
            const isAdmin = client.data.role === 'admin' || client.data.role === 'superAdmin';
            if (!isAdmin) {
              const muteSec = this.chatMute.recordAndCheck(rid, userId, trimmed);
              if (muteSec > 0) {
                this.sendToUser(rid, userId, WsEvent.ChatMuted, `도배로 인해 채팅이 ${muteSec}초간 제한되었습니다`);
                return;
              }
            }

            // 서버에서 userId/nickname/role 강제 주입 (클라이언트 위조 방지)
            const enriched = {
              userId: client.data.userId,
              nickname: client.data.nickname,
              role: client.data.role,
              message: trimmed,
              timestamp: parsed.timestamp ?? new Date().toISOString(),
            };
            const msg = JSON.stringify(enriched);
            const buf = Buffer.alloc(1 + Buffer.byteLength(msg));
            buf[0] = WsOpCode.Chat;
            buf.write(msg, 1);
            this.broadcastToRoom(client.data.roomId, buf);
            // Store in chatHistory
            const hist = this.chatHistory.get(client.data.roomId) ?? [];
            hist.push({
              userId: enriched.userId,
              nickname: enriched.nickname,
              message: enriched.message,
              timestamp: enriched.timestamp,
              role: enriched.role,
            });
            if (hist.length > 50) hist.shift();
            this.chatHistory.set(client.data.roomId, hist);
          } catch (e) {
            this.logger.warn('Chat message parse failed', e instanceof Error ? e.message : e);
          }
        } else if (data[0] === WsOpCode.Heartbeat) {
          this.lastHeartbeat.set(`${client.data.userId}:${client.data.roomId}`, Date.now());
        } else if (data[0] === WsOpCode.Resync) {
          const ok = this.audio.resyncListener(client.data.roomId, client.data.audioCallback);
          if (!ok && client.readyState === WebSocket.OPEN) {
            client.send(Buffer.from([WsOpCode.ResyncWait]));
          }
        } else if (data[0] === WsOpCode.ListenerStatus && data.length >= 2) {
          client.data.listening = data[1] === 1;
          // 듣기 끄면 synced 해제 → 다음 resync에서 init segment 재전송
          if (!client.data.listening) {
            this.audio.unsyncListener(client.data.roomId, client.data.audioCallback);
          }
          this.broadcastListenerCount(client.data.roomId);
        } else if (data[0] === WsOpCode.Reaction && data.length >= 2) {
          if (!client.data.permissions.includes(Permission.Reaction)) return;
          // 리액션 → 방 전체에 broadcast (본인 포함, 2번째 바이트=리액션 인덱스)
          this.broadcastToRoom(client.data.roomId, data);
        } else if (data[0] === WsOpCode.PingMeasure && data.length >= 9) {
          // 클라이언트 타임스탬프 에코 (RTT 측정용)
          if (client.readyState === WebSocket.OPEN) client.send(data);
        }
      });

      client.on('close', (code: number) => this.handleDisconnect(client, code));

      if (!wasReconnect) {
        this.broadcastSystem(roomId, WsEvent.UserJoined, '', { nickname });
      }
      // Send chat history to this client only
      const history = this.chatHistory.get(roomId);
      if (history?.length) {
        const histMsg = JSON.stringify({ event: WsEvent.ChatHistory, detail: '', data: { messages: history } });
        const histBuf = Buffer.alloc(1 + Buffer.byteLength(histMsg));
        histBuf[0] = WsOpCode.System;
        histBuf.write(histMsg, 1);
        if (client.readyState === WebSocket.OPEN) client.send(histBuf);
      }
      // mute 상태 전송 (재접속 시 카운트다운 복원)
      const mutedSec = this.chatMute.isMuted(roomId, userId);
      if (mutedSec > 0) {
        this.sendToUser(roomId, userId, WsEvent.ChatMuted, `채팅이 제한되었습니다 (${mutedSec}초 후 해제)`);
      }
      this.broadcastListenerCount(roomId);
      this.logger.log(`Client ${userId} connected to room ${roomId}`);
    } catch (e) {
      this.logger.error('Connection error', e instanceof Error ? e.stack : e);
      client.close(4001, 'Error');
    }
  }

  private async handleDisconnect(client: WsClient, code?: number): Promise<void> {
    const d = client.data;
    if (!d) return;

    this.audio.removeListener(d.roomId, d.audioCallback);
    this.lastHeartbeat.delete(`${d.userId}:${d.roomId}`);

    const clients = this.roomClients.get(d.roomId);
    if (clients) {
      clients.delete(client);
      if (!clients.size) this.roomClients.delete(d.roomId);
    }

    this.logger.log(`WS disconnected: ${d.nickname} from room ${d.roomId} (code: ${code ?? 'unknown'})`);

    // 다른 탭에서 아직 연결 중이면 무시
    let stillConnected = false;
    this.roomClients.get(d.roomId)?.forEach((c) => {
      if (c.data?.userId === d.userId) stillConnected = true;
    });
    if (stillConnected) {
      this.broadcastListenerCount(d.roomId);
      return;
    }

    // kick/ban은 즉시 처리 (controller에서 이미 removeMember 완료)
    if (code === WS_CLOSE_KICKED) {
      this.broadcastListenerCount(d.roomId);
      return;
    }

    // Grace period — 새로고침 시 즉시 퇴장 처리 방지
    const key = `${d.userId}:${d.roomId}`;
    clearTimeout(this.pendingDisconnects.get(key));
    this.pendingDisconnects.set(
      key,
      setTimeout(() => {
        this.pendingDisconnects.delete(key);
        void this.finalizeDisconnect(d.roomId, d.userId, d.nickname);
      }, WS_GRACE_MS),
    );

    this.broadcastListenerCount(d.roomId);
  }

  /** grace period 만료 후 실제 멤버 제거 + 퇴장 메시지 */
  private async finalizeDisconnect(roomId: string, userId: string, nickname: string): Promise<void> {
    // grace 동안 재연결했으면 중단
    let reconnected = false;
    this.roomClients.get(roomId)?.forEach((c) => {
      if (c.data?.userId === userId) reconnected = true;
    });
    if (reconnected) return;

    await this.rooms.removeMember(roomId, userId).catch(() => {});
    this.broadcastSystem(roomId, WsEvent.UserLeft, '', { nickname });

    const count = await this.rooms.getMemberCount(roomId).catch(() => 0);
    if (count === 0) {
      this.audio.destroyRoom(roomId);
      await this.rooms.deactivateRoom(roomId).catch(() => {});
      this.logger.log(`Room ${roomId} deactivated (no members)`);
    } else {
      const wasHost = await this.rooms.isHost(roomId, userId).catch(() => false);
      if (wasHost) {
        const newHost = await this.rooms.transferHost(roomId).catch(() => null);
        if (newHost) this.broadcastSystem(roomId, WsEvent.HostChanged, '', { nickname: newHost.nickname });
      }
    }
    this.broadcastListenerCount(roomId);
  }

  private broadcastListenerCount(roomId: string): void {
    let count = 0;
    this.roomClients.get(roomId)?.forEach((c) => {
      if (c.data?.listening) count++;
    });
    this.broadcastSystem(roomId, WsEvent.ListenerCount, '', { count });
  }

  kickUser(roomId: string, userId: string): void {
    this.roomClients.get(roomId)?.forEach((c) => {
      if (c.data?.userId === userId) c.close(WS_CLOSE_KICKED, 'Kicked');
    });
  }

  disconnectUser(userId: string, code: number): void {
    for (const [, clients] of this.roomClients) {
      for (const c of clients) {
        if (c.data?.userId === userId) c.close(code, 'Banned');
      }
    }
  }

  sendToUser(roomId: string, userId: string, event: WsEvent, detail: string): void {
    const msg = JSON.stringify({ event, detail });
    const buf = Buffer.alloc(1 + Buffer.byteLength(msg));
    buf[0] = WsOpCode.System;
    buf.write(msg, 1);
    this.roomClients.get(roomId)?.forEach((c) => {
      if (c.data?.userId === userId && c.readyState === WebSocket.OPEN) c.send(buf);
    });
  }

  broadcastSystem(roomId: string, event: WsEvent, detail: string, data?: unknown): void {
    const msg = JSON.stringify({ event, detail, ...(data ? { data } : {}) });
    const buf = Buffer.alloc(1 + Buffer.byteLength(msg));
    buf[0] = WsOpCode.System;
    buf.write(msg, 1);
    this.broadcastToRoom(roomId, buf);
  }

  private broadcastToRoom(roomId: string, data: Buffer, exclude?: WsClient): void {
    this.roomClients.get(roomId)?.forEach((c) => {
      if (c !== exclude && c.readyState === WebSocket.OPEN) c.send(data);
    });
  }
}
