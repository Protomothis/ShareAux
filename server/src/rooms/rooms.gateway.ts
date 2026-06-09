import type { OnModuleDestroy } from '@nestjs/common';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import type { IncomingMessage, Server as HttpServer } from 'http';
import type { Duplex } from 'stream';
import { WebSocket, WebSocketServer } from 'ws';

import { AuthService } from '../auth/auth.service.js';
import {
  WS_CLOSE_BANNED,
  WS_CLOSE_DUPLICATE_SESSION,
  WS_CLOSE_JOINED_OTHER_ROOM,
  WS_CLOSE_KICKED,
  WS_CLOSE_ROOM_GONE,
  WS_GRACE_MS,
  WS_HEARTBEAT_INTERVAL_MS,
} from '../constants.js';
import { AudioService } from '../services/audio.service.js';
import { ChatMuteService } from '../services/chat-mute.service.js';
import type { WsClient, WsPayloadMap } from '../types/index.js';
import { UserRole, WsEvent, WsOpCode } from '../types/index.js';
import { RoomsService } from './rooms.service.js';
import { WsAuthService } from './ws-auth.service.js';
import { WsBroadcaster } from './ws-broadcaster.service.js';
import { WsMessageRouter } from './ws-message-router.service.js';

/**
 * RoomsGateway — WebSocket 연결 관리
 * 인증, 방 입장/퇴장, heartbeat, grace period만 담당.
 * 메시지 처리는 WsMessageRouter, 전송은 WsBroadcaster에 위임.
 */
@Injectable()
export class RoomsGateway implements OnModuleDestroy {
  private readonly logger = new Logger(RoomsGateway.name);
  private pendingDisconnects = new Map<string, ReturnType<typeof setTimeout>>();
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private wss?: WebSocketServer;

  constructor(
    private audio: AudioService,
    private chatMute: ChatMuteService,
    private rooms: RoomsService,
    private wsAuth: WsAuthService,
    private broadcaster: WsBroadcaster,
    private router: WsMessageRouter,
    @Inject(forwardRef(() => AuthService)) private auth: AuthService,
  ) {}

  onModuleDestroy(): void {
    clearInterval(this.heartbeatInterval);
    this.wss?.close();
  }

  attachToServer(httpServer: HttpServer): void {
    this.wss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      if (req.url?.split('?')[0] !== '/ws') {
        socket.destroy();
        return;
      }

      const { allowed } = this.wsAuth.checkUpgrade(req);
      if (!allowed) {
        socket.destroy();
        return;
      }

      this.wss!.handleUpgrade(req, socket, head, (client) => {
        void this.handleConnection(client, req);
      });
    });

    this.heartbeatInterval = setInterval(() => this.checkHeartbeats(), WS_HEARTBEAT_INTERVAL_MS);
    this.logger.log('WebSocket server attached at /ws');
  }

  // --- Heartbeat ---

  private async checkHeartbeats(): Promise<void> {
    const now = Date.now();
    this.wsAuth.cleanupExpiredEntries();

    const heartbeats = this.router.getHeartbeats();
    for (const [roomId, clients] of this.broadcaster.getRoomClients()) {
      for (const c of clients) {
        if (!c.data) continue;
        const key = `${c.data.userId}:${roomId}`;
        const last = heartbeats.get(key) ?? 0;
        if (now - last < 60_000) continue;

        this.logger.log(`Heartbeat timeout: ${c.data.nickname} in room ${roomId}`);
        heartbeats.delete(key);
        this.audio.removeListener(roomId, c.data.audioCallback);
        this.broadcaster.removeClient(roomId, c);
        c.close(4002, 'Heartbeat timeout');

        const pendingKey = `${c.data.userId}:${roomId}`;
        clearTimeout(this.pendingDisconnects.get(pendingKey));
        this.pendingDisconnects.delete(pendingKey);
        await this.finalizeDisconnect(roomId, c.data.userId, c.data.nickname);
      }
    }

    // 빈 방의 chatHistory 정리
    // (WsMessageRouter가 자체적으로 cleanupRoom 호출 시 정리됨)
  }

  // --- Connection ---

  private async handleConnection(client: WsClient, req: IncomingMessage): Promise<void> {
    try {
      const authResult = this.wsAuth.authenticate(req);
      if (!authResult.ok) {
        client.close(4001, authResult.reason);
        return;
      }

      const { payload, roomId } = authResult;
      const userId = payload.sub;
      const nickname = payload.nickname || userId.slice(0, 8);

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
          this.audio.unsyncListener(client.data?.roomId ?? '', audioCallback);
        }
      };

      const { permissions: perms } = await this.rooms.getEffectivePermissions(roomId, userId);
      const isActive = await this.rooms.isRoomActive(roomId);
      if (!isActive) {
        client.close(WS_CLOSE_ROOM_GONE, 'Room not found');
        return;
      }

      client.data = {
        userId,
        roomId,
        audioCallback,
        nickname,
        role: payload.role ?? UserRole.User,
        permissions: perms,
      };

      // Grace period 재연결 체크
      const pendingKey = `${userId}:${roomId}`;
      const wasReconnect = this.pendingDisconnects.has(pendingKey);
      if (wasReconnect) {
        clearTimeout(this.pendingDisconnects.get(pendingKey));
        this.pendingDisconnects.delete(pendingKey);
      }

      // 다른 방 연결 정리 (1인 1방)
      for (const [otherRoomId, clients] of this.broadcaster.getRoomClients().entries()) {
        if (otherRoomId === roomId) continue;
        for (const old of clients) {
          if (old.data?.userId === userId) {
            this.audio.removeListener(otherRoomId, old.data.audioCallback);
            old.close(WS_CLOSE_JOINED_OTHER_ROOM, 'Joined another room');
            this.broadcaster.removeClient(otherRoomId, old);
          }
        }
      }

      // 중복 세션 정리
      const roomClients = this.broadcaster.getRoomClients().get(roomId);
      if (roomClients) {
        for (const old of roomClients) {
          if (old.data?.userId === userId && old !== client) {
            this.audio.removeListener(roomId, old.data.audioCallback);
            old.close(WS_CLOSE_DUPLICATE_SESSION, 'Duplicate session');
            this.broadcaster.removeClient(roomId, old);
          }
        }
      }

      this.broadcaster.addClient(roomId, client);
      this.audio.addListener(roomId, audioCallback);
      this.router.getHeartbeats().set(`${userId}:${roomId}`, Date.now());

      // 메시지 라우팅
      client.on('message', (raw: Buffer | string) => {
        const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        this.router.routeMessage(client, buf);
      });

      client.on('close', (code: number) => this.handleDisconnect(client, code));

      // 입장 알림 + 히스토리 전송
      if (!wasReconnect) {
        this.broadcaster.broadcastSystem(roomId, WsEvent.UserJoined, '', { nickname });
      }
      const history = this.router.getChatHistory(roomId);
      if (history?.length) {
        const histMsg = JSON.stringify({ event: WsEvent.ChatHistory, detail: '', data: { messages: history } });
        const histBuf = Buffer.alloc(1 + Buffer.byteLength(histMsg));
        histBuf[0] = WsOpCode.System;
        histBuf.write(histMsg, 1);
        if (client.readyState === WebSocket.OPEN) client.send(histBuf);
      }

      // mute 상태 전송
      const mutedSec = this.chatMute.isMuted(roomId, userId);
      if (mutedSec > 0) this.broadcaster.sendToUser(roomId, userId, WsEvent.ChatMuted, `${mutedSec}`);

      this.broadcaster.broadcastListenerCount(roomId);
      this.logger.log(`Client ${userId} connected to room ${roomId}`);
    } catch (e) {
      this.logger.error('Connection error', e instanceof Error ? e.stack : e);
      client.close(4001, 'Error');
    }
  }

  // --- Disconnect ---

  private async handleDisconnect(client: WsClient, code?: number): Promise<void> {
    const d = client.data;
    if (!d) return;

    this.audio.removeListener(d.roomId, d.audioCallback);
    this.router.getHeartbeats().delete(`${d.userId}:${d.roomId}`);
    this.broadcaster.removeClient(d.roomId, client);

    if (this.broadcaster.isUserConnected(d.roomId, d.userId)) {
      this.broadcaster.broadcastListenerCount(d.roomId);
      return;
    }

    if (code === WS_CLOSE_KICKED) {
      this.broadcaster.broadcastListenerCount(d.roomId);
      return;
    }

    // Grace period
    const key = `${d.userId}:${d.roomId}`;
    clearTimeout(this.pendingDisconnects.get(key));
    this.pendingDisconnects.set(
      key,
      setTimeout(() => {
        this.pendingDisconnects.delete(key);
        void this.finalizeDisconnect(d.roomId, d.userId, d.nickname);
      }, WS_GRACE_MS),
    );
    this.broadcaster.broadcastListenerCount(d.roomId);
  }

  private async finalizeDisconnect(roomId: string, userId: string, nickname: string): Promise<void> {
    if (this.broadcaster.isUserConnected(roomId, userId)) return;

    await this.rooms
      .removeMember(roomId, userId)
      .catch((e: unknown) => this.logger.warn(`[removeMember] ${(e as Error).message}`));
    this.broadcaster.broadcastSystem(roomId, WsEvent.UserLeft, '', { nickname });

    const count = await this.rooms.getMemberCount(roomId).catch(() => 0);
    if (count === 0) {
      this.audio.destroyRoom(roomId);
      this.router.cleanupRoom(roomId);
      await this.rooms
        .deactivateRoom(roomId)
        .catch((e: unknown) => this.logger.warn(`[deactivateRoom] ${(e as Error).message}`));
      this.logger.log(`Room ${roomId} deactivated (no members)`);
    } else {
      const wasHost = await this.rooms.isHost(roomId, userId).catch(() => false);
      if (wasHost) {
        const newHost = await this.rooms.transferHost(roomId).catch(() => null);
        if (newHost) this.broadcaster.broadcastSystem(roomId, WsEvent.HostChanged, '', { nickname: newHost.nickname });
      }
    }
    this.broadcaster.broadcastListenerCount(roomId);
  }

  // --- Public API (controller에서 호출) ---

  kickUser(roomId: string, userId: string): void {
    this.broadcaster.kickUser(roomId, userId, WS_CLOSE_KICKED);
  }

  disconnectUser(userId: string, code: number): void {
    this.broadcaster.disconnectUser(userId, code);
  }

  sendToUser(roomId: string, userId: string, event: WsEvent, detail: string): void {
    this.broadcaster.sendToUser(roomId, userId, event, detail);
  }

  broadcastSystem<E extends WsEvent>(
    roomId: string,
    event: E,
    detail: string,
    ...args: undefined extends WsPayloadMap[E] ? [data?: WsPayloadMap[E]] : [data: WsPayloadMap[E]]
  ): void {
    this.broadcaster.broadcastSystem(roomId, event, detail, ...args);
  }

  clearChatHistory(roomId: string): void {
    this.router.clearChatHistory(roomId);
  }

  getRoomUserIds(roomId: string): string[] {
    return this.broadcaster.getRoomUserIds(roomId);
  }

  broadcastChatMessage(roomId: string, nickname: string, message: string): void {
    this.router.broadcastChatMessage(roomId, nickname, message);
  }
}
