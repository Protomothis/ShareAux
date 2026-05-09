import { Injectable } from '@nestjs/common';
import { WebSocket } from 'ws';

import type { WsClient } from '../types/index.js';
import { WsEvent, WsOpCode } from '../types/index.js';

/**
 * WsBroadcaster — 방 단위 메시지 전송 담당
 */
@Injectable()
export class WsBroadcaster {
  private roomClients = new Map<string, Set<WsClient>>();

  getRoomClients(): Map<string, Set<WsClient>> {
    return this.roomClients;
  }

  addClient(roomId: string, client: WsClient): void {
    if (!this.roomClients.has(roomId)) this.roomClients.set(roomId, new Set());
    this.roomClients.get(roomId)!.add(client);
  }

  removeClient(roomId: string, client: WsClient): void {
    const clients = this.roomClients.get(roomId);
    if (!clients) return;
    clients.delete(client);
    if (!clients.size) this.roomClients.delete(roomId);
  }

  broadcastToRoom(roomId: string, data: Buffer, exclude?: WsClient): void {
    this.roomClients.get(roomId)?.forEach((c) => {
      if (c !== exclude && c.readyState === WebSocket.OPEN) c.send(data);
    });
  }

  broadcastSystem(roomId: string, event: WsEvent, detail: string, data?: unknown): void {
    const msg = JSON.stringify({ event, detail, ...(data ? { data } : {}) });
    const buf = Buffer.alloc(1 + Buffer.byteLength(msg));
    buf[0] = WsOpCode.System;
    buf.write(msg, 1);
    this.broadcastToRoom(roomId, buf);
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

  kickUser(roomId: string, userId: string, code: number): void {
    this.roomClients.get(roomId)?.forEach((c) => {
      if (c.data?.userId === userId) c.close(code, 'Kicked');
    });
  }

  disconnectUser(userId: string, code: number): void {
    for (const [, clients] of this.roomClients) {
      for (const c of clients) {
        if (c.data?.userId === userId) c.close(code, 'Banned');
      }
    }
  }

  broadcastListenerCount(roomId: string): void {
    let count = 0;
    this.roomClients.get(roomId)?.forEach((c) => {
      if (c.data?.listening) count++;
    });
    this.broadcastSystem(roomId, WsEvent.ListenerCount, '', { count });
  }

  getRoomUserIds(roomId: string): string[] {
    const ids = new Set<string>();
    this.roomClients.get(roomId)?.forEach((c) => {
      if (c.data?.userId) ids.add(c.data.userId);
    });
    return [...ids];
  }

  isUserConnected(roomId: string, userId: string): boolean {
    let found = false;
    this.roomClients.get(roomId)?.forEach((c) => {
      if (c.data?.userId === userId) found = true;
    });
    return found;
  }
}
