import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebSocket } from 'ws';

import { AudioService } from '../services/audio.service.js';
import { ChatMuteService } from '../services/chat-mute.service.js';
import type { ChatHistoryEntry, WsClient } from '../types/index.js';
import { Permission, UserRole, WsEvent, WsOpCode } from '../types/index.js';
import { PushEvent } from '../types/push-event.enum.js';
import { PUSH_EVENT, pushPayload } from '../types/push-event-payload.js';
import { WsBroadcaster } from './ws-broadcaster.service.js';

/**
 * WsMessageRouter — opcode별 메시지 처리
 */
@Injectable()
export class WsMessageRouter {
  private readonly logger = new Logger(WsMessageRouter.name);
  private chatHistory = new Map<string, ChatHistoryEntry[]>();
  private lastChat = new Map<string, number>();

  constructor(
    private audio: AudioService,
    private chatMute: ChatMuteService,
    private broadcaster: WsBroadcaster,
    private eventEmitter: EventEmitter2,
  ) {}

  /** 하트비트 타임스탬프 저장용 (gateway에서 공유) */
  private heartbeats = new Map<string, number>();
  getHeartbeats(): Map<string, number> {
    return this.heartbeats;
  }

  routeMessage(client: WsClient, data: Buffer): void {
    if (!client.data || data.length < 1) return;
    const opcode = data[0];

    switch (opcode) {
      case WsOpCode.Chat:
        if (data.length > 1) this.handleChat(client, data);
        break;
      case WsOpCode.Heartbeat:
        this.heartbeats.set(`${client.data.userId}:${client.data.roomId}`, Date.now());
        break;
      case WsOpCode.Resync:
        this.handleResync(client);
        break;
      case WsOpCode.ListenerStatus:
        if (data.length >= 2) this.handleListenerStatus(client, data[1] === 1);
        break;
      case WsOpCode.Reaction:
        if (data.length >= 2) this.handleReaction(client, data);
        break;
      case WsOpCode.PingMeasure:
        if (data.length >= 9 && client.readyState === WebSocket.OPEN) client.send(data);
        break;
    }
  }

  private handleChat(client: WsClient, data: Buffer): void {
    if (!client.data!.permissions.includes(Permission.Chat)) return;
    try {
      const parsed = JSON.parse(data.subarray(1).toString());
      if (!parsed.message || typeof parsed.message !== 'string' || parsed.message.length > 300) return;
      const trimmed = parsed.message.trim().replace(/[<>]/g, '');
      if (!trimmed) return;

      const { userId, roomId, nickname, role } = client.data!;

      // mute 체크
      const mutedSec = this.chatMute.isMuted(roomId, userId);
      if (mutedSec > 0) {
        this.broadcaster.sendToUser(roomId, userId, WsEvent.ChatMuted, `${mutedSec}`);
        return;
      }

      // 레이트 리밋 (1초에 1개)
      const rateKey = `chat:${userId}`;
      const last = this.lastChat.get(rateKey) ?? 0;
      if (Date.now() - last < 1000) return;
      this.lastChat.set(rateKey, Date.now());

      // admin/superAdmin은 자동 mute 면제
      const isAdmin = role === 'admin' || role === 'superAdmin';
      if (!isAdmin) {
        const muteSec = this.chatMute.recordAndCheck(roomId, userId, trimmed);
        if (muteSec > 0) {
          this.broadcaster.sendToUser(roomId, userId, WsEvent.ChatMuted, `${muteSec}`);
          return;
        }
      }

      // 서버에서 userId/nickname/role 강제 주입
      const enriched = {
        userId,
        nickname,
        role,
        message: trimmed,
        timestamp: parsed.timestamp ?? new Date().toISOString(),
      };
      const msg = JSON.stringify(enriched);
      const buf = Buffer.alloc(1 + Buffer.byteLength(msg));
      buf[0] = WsOpCode.Chat;
      buf.write(msg, 1);
      this.broadcaster.broadcastToRoom(roomId, buf);

      // chatHistory 저장
      const hist = this.chatHistory.get(roomId) ?? [];
      hist.push(enriched);
      if (hist.length > 50) hist.shift();
      this.chatHistory.set(roomId, hist);

      // 멘션 감지 → 푸시 알림
      const mentions = trimmed.match(/@(\S+)/g);
      if (mentions) {
        const roomClients = this.broadcaster.getRoomClients().get(roomId);
        if (roomClients) {
          const mentionedIds: string[] = [];
          for (const m of mentions) {
            const nick = m.slice(1);
            for (const c of roomClients) {
              if (c.data && c.data.nickname === nick && c.data.userId !== userId) {
                mentionedIds.push(c.data.userId);
              }
            }
          }
          if (mentionedIds.length > 0) {
            this.eventEmitter.emit(
              PUSH_EVENT,
              pushPayload(PushEvent.Mention, {
                roomId,
                userIds: mentionedIds,
                tag: `mention:${roomId}`,
                data: { nickname, message: trimmed },
              }),
            );
          }
        }
      }
    } catch (e) {
      this.logger.warn('Chat message parse failed', e instanceof Error ? e.message : e);
    }
  }

  private handleResync(client: WsClient): void {
    const ok = this.audio.resyncListener(client.data!.roomId, client.data!.audioCallback);
    if (!ok && client.readyState === WebSocket.OPEN) {
      client.send(Buffer.from([WsOpCode.ResyncWait]));
    }
  }

  private handleListenerStatus(client: WsClient, listening: boolean): void {
    client.data!.listening = listening;
    if (!listening) {
      this.audio.unsyncListener(client.data!.roomId, client.data!.audioCallback);
    }
    this.broadcaster.broadcastListenerCount(client.data!.roomId);
  }

  private handleReaction(client: WsClient, data: Buffer): void {
    if (!client.data!.permissions.includes(Permission.Reaction)) return;
    this.broadcaster.broadcastToRoom(client.data!.roomId, data);
  }

  // --- Chat history ---

  getChatHistory(roomId: string): ChatHistoryEntry[] | undefined {
    return this.chatHistory.get(roomId);
  }

  clearChatHistory(roomId: string): void {
    this.chatHistory.delete(roomId);
  }

  cleanupRoom(roomId: string): void {
    this.chatHistory.delete(roomId);
  }

  /** 외부에서 채팅 메시지 주입 (시스템용) */
  broadcastChatMessage(roomId: string, nickname: string, message: string): void {
    const enriched: ChatHistoryEntry = {
      userId: 'system',
      nickname,
      role: UserRole.User,
      message,
      timestamp: new Date().toISOString(),
    };
    const hist = this.chatHistory.get(roomId) ?? [];
    hist.push(enriched);
    if (hist.length > 50) hist.shift();
    this.chatHistory.set(roomId, hist);

    const json = JSON.stringify(enriched);
    const buf = Buffer.alloc(1 + Buffer.byteLength(json));
    buf[0] = WsOpCode.Chat;
    buf.write(json, 1);
    this.broadcaster.broadcastToRoom(roomId, buf);
  }
}
