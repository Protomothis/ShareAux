import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import webpush from 'web-push';

import { PushSettings } from '../entities/push-settings.entity.js';
import { PushSubscription } from '../entities/push-subscription.entity.js';
import { SettingsService } from '../services/settings.service.js';
import { OptionKey } from '../types/settings.types.js';
import { Language } from '../types/language.enum.js';
import type { PushEvent } from '../types/push-event.enum.js';
import { PUSH_EVENT, type PushEventPayload } from '../types/push-event-payload.js';
import type { UpdatePushSettingsDto } from './dto/update-push-settings.dto.js';

interface PushPayload {
  event: PushEvent;
  tag: string;
  roomId: string;
  icon?: string;
  image?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class PushService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PushService.name);
  private initialized = false;

  constructor(
    @InjectRepository(PushSubscription) private readonly subRepo: Repository<PushSubscription>,
    @InjectRepository(PushSettings) private readonly settingsRepo: Repository<PushSettings>,
    private readonly settings: SettingsService,
  ) {}

  onApplicationBootstrap(): void {
    this.initVapid();
  }

  private initVapid(): void {
    const publicKey = this.settings.getSecret(OptionKey.VapidPublicKey);
    const privateKey = this.settings.getSecret(OptionKey.VapidPrivateKey);
    const mailto = this.settings.get(OptionKey.VapidMailto);
    if (!publicKey || !privateKey) {
      this.logger.warn('VAPID keys not configured — Push disabled');
      return;
    }
    webpush.setVapidDetails(mailto, publicKey, privateKey);
    this.initialized = true;
    this.logger.log('Web Push initialized');
  }

  get isEnabled(): boolean {
    return this.initialized;
  }

  getVapidPublicKey(): string {
    return this.settings.getSecret(OptionKey.VapidPublicKey);
  }

  // ─── Subscription CRUD ───

  async subscribe(userId: string, endpoint: string, p256dh: string, auth: string, locale: Language): Promise<void> {
    await this.subRepo.upsert({ userId, endpoint, p256dh, auth, locale }, ['endpoint']);
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.subRepo.delete({ userId, endpoint });
  }

  // ─── Settings CRUD ───

  async getSettings(userId: string): Promise<PushSettings> {
    let s = await this.settingsRepo.findOneBy({ userId });
    if (!s) {
      await this.settingsRepo.upsert({ userId }, ['userId']);
      s = await this.settingsRepo.findOneByOrFail({ userId });
    }
    return s;
  }

  async updateSettings(userId: string, dto: UpdatePushSettingsDto): Promise<PushSettings> {
    let s = await this.settingsRepo.findOneBy({ userId });
    if (!s) {
      s = this.settingsRepo.create({ userId });
    }
    Object.assign(s, dto);
    return this.settingsRepo.save(s);
  }

  // ─── Event Listener ───

  @OnEvent(PUSH_EVENT)
  async handlePushEvent(payload: PushEventPayload): Promise<void> {
    if (!this.initialized) return;
    const targets = payload.excludeUserId
      ? payload.userIds.filter((id) => id !== payload.excludeUserId)
      : payload.userIds;
    if (!targets.length) return;
    await this.sendToUsers(targets, {
      event: payload.event,
      tag: payload.tag,
      roomId: payload.roomId,
      icon: payload.icon,
      image: payload.image,
      data: payload.data,
    });
  }

  // ─── Test ───

  async sendTestPush(userId: string): Promise<void> {
    if (!this.initialized) return;
    const subs = await this.subRepo.findBy({ userId });
    for (const sub of subs) {
      await this.send(sub, { event: 'test' as PushEvent, tag: 'test', roomId: '' });
    }
  }

  // ─── Send ───

  /** 특정 유저에게 Push 발송 (설정 체크 포함) */
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.initialized) return;

    const settings = await this.settingsRepo.findOneBy({ userId });
    if (settings && !this.isEventEnabled(settings, payload.event)) return;

    const subs = await this.subRepo.findBy({ userId });
    await Promise.allSettled(subs.map((sub) => this.send(sub, payload)));
  }

  /** 여러 유저에게 Push 발송 */
  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    await Promise.allSettled(userIds.map((id) => this.sendToUser(id, payload)));
  }

  private async send(sub: PushSubscription, payload: PushPayload): Promise<void> {
    if (!this.initialized) return;
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ ...payload, locale: sub.locale }),
      );
    } catch (e: unknown) {
      const status = (e as { statusCode?: number }).statusCode;
      this.logger.warn(`Push send failed: status=${status} endpoint=${sub.endpoint.slice(0, 50)}`);
      if (status === 410 || status === 404) {
        // 구독 만료/삭제
        await this.subRepo.delete({ id: sub.id });
      }
    }
  }

  private isEventEnabled(settings: PushSettings, event: PushEvent): boolean {
    const map: Record<PushEvent, keyof PushSettings> = {
      trackChanged: 'trackChanged',
      voteSkipPassed: 'voteSkip',
      hostChanged: 'hostChanged',
      kicked: 'trackChanged', // kicked는 항상 발송 — 여기서 체크 안 함
      mention: 'mention',
    };
    const key = map[event];
    return key ? (settings[key] as boolean) : true;
  }
}
