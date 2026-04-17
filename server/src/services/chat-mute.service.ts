import { Injectable } from '@nestjs/common';

import {
  CHAT_DUPE_MAX_COUNT,
  CHAT_DUPE_WINDOW_MS,
  CHAT_MUTE_ESCALATION_MS,
  CHAT_MUTE_LEVELS_SEC,
  CHAT_SPAM_MAX_COUNT,
  CHAT_SPAM_WINDOW_MS,
} from '../constants.js';

interface MuteState {
  until: number; // mute 해제 시각 (ms)
  level: number; // 현재 단계 (0-based)
  lastViolation: number; // 마지막 위반 시각
}

interface MessageLog {
  timestamps: number[];
  lastMessages: { text: string; time: number }[];
}

@Injectable()
export class ChatMuteService {
  // key: `${roomId}:${userId}`
  private mutes = new Map<string, MuteState>();
  private logs = new Map<string, MessageLog>();

  /** mute 상태 확인. muted면 남은 초 리턴, 아니면 0 */
  isMuted(roomId: string, userId: string): number {
    const state = this.mutes.get(`${roomId}:${userId}`);
    if (!state) return 0;
    const remaining = Math.ceil((state.until - Date.now()) / 1000);
    if (remaining <= 0) {
      this.mutes.delete(`${roomId}:${userId}`);
      return 0;
    }
    return remaining;
  }

  /** 메시지 기록 + 위반 감지. 위반 시 mute 적용하고 제한 초 리턴, 정상이면 0 */
  recordAndCheck(roomId: string, userId: string, message: string): number {
    const key = `${roomId}:${userId}`;
    const now = Date.now();

    if (!this.logs.has(key)) this.logs.set(key, { timestamps: [], lastMessages: [] });
    const log = this.logs.get(key)!;

    // 오래된 로그 정리
    log.timestamps = log.timestamps.filter((t) => now - t < CHAT_SPAM_WINDOW_MS);
    log.lastMessages = log.lastMessages.filter((m) => now - m.time < CHAT_DUPE_WINDOW_MS);

    log.timestamps.push(now);
    log.lastMessages.push({ text: message, time: now });

    // 스팸 감지
    if (log.timestamps.length > CHAT_SPAM_MAX_COUNT) {
      return this.applyMute(key, now);
    }

    // 중복 감지
    const dupeCount = log.lastMessages.filter((m) => m.text === message).length;
    if (dupeCount >= CHAT_DUPE_MAX_COUNT) {
      return this.applyMute(key, now);
    }

    return 0;
  }

  /** 수동 mute (호스트/admin) */
  manualMute(roomId: string, userId: string, seconds: number): void {
    this.mutes.set(`${roomId}:${userId}`, {
      until: Date.now() + seconds * 1000,
      level: 0,
      lastViolation: Date.now(),
    });
  }

  /** 수동 unmute */
  unmute(roomId: string, userId: string): void {
    this.mutes.delete(`${roomId}:${userId}`);
    this.logs.delete(`${roomId}:${userId}`);
  }

  /** 방의 모든 mute 목록 */
  getMutes(roomId: string): { userId: string; remainingSec: number; level: number }[] {
    const result: { userId: string; remainingSec: number; level: number }[] = [];
    const prefix = `${roomId}:`;
    for (const [key, state] of this.mutes) {
      if (!key.startsWith(prefix)) continue;
      const remaining = Math.ceil((state.until - Date.now()) / 1000);
      if (remaining <= 0) continue;
      result.push({ userId: key.slice(prefix.length), remainingSec: remaining, level: state.level });
    }
    return result;
  }

  /** 방 정리 (방 종료 시) */
  clearRoom(roomId: string): void {
    const prefix = `${roomId}:`;
    for (const key of this.mutes.keys()) if (key.startsWith(prefix)) this.mutes.delete(key);
    for (const key of this.logs.keys()) if (key.startsWith(prefix)) this.logs.delete(key);
  }

  private applyMute(key: string, now: number): number {
    const existing = this.mutes.get(key);
    let level = 0;
    if (existing && now - existing.lastViolation < CHAT_MUTE_ESCALATION_MS) {
      level = Math.min(existing.level + 1, CHAT_MUTE_LEVELS_SEC.length - 1);
    }
    const seconds = CHAT_MUTE_LEVELS_SEC[level];
    this.mutes.set(key, { until: now + seconds * 1000, level, lastViolation: now });
    this.logs.delete(key); // 로그 리셋
    return seconds;
  }
}
