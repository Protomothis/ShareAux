import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SystemSetting } from '../entities/system-setting.entity.js';

const DEFAULTS: Record<string, string> = {
  'auth.guestEnabled': 'true',
  'auth.googleEnabled': 'true',
  'auth.guestMaxAge': '12',
  'room.maxMembers': '20',
  'room.maxRoomsPerUser': '3',
  'autodj.enabled': 'true',
  'queue.maxPerUser': '10',
  'queue.maxDuration': '10',
  'stream.maxBitrateEnabled': 'false',
  'stream.maxBitrate': '160',
  'translation.enabled': 'true',
  'translation.dailyLimit': '200',
  'translation.model': 'gemini-2.5-flash-lite',
};

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private readonly cache = new Map<string, string>();

  constructor(@InjectRepository(SystemSetting) private readonly repo: Repository<SystemSetting>) {}

  async onModuleInit(): Promise<void> {
    const settings = await this.repo.find();
    for (const s of settings) this.cache.set(s.key, s.value);
    this.logger.log(`Loaded ${settings.length} system settings`);
  }

  get(key: string, defaultValue?: string): string {
    return this.cache.get(key) ?? defaultValue ?? DEFAULTS[key] ?? '';
  }

  getNumber(key: string, defaultValue?: number): number {
    const v = this.cache.get(key);
    return v !== undefined ? Number(v) : (defaultValue ?? Number(DEFAULTS[key])) || 0;
  }

  getBoolean(key: string, defaultValue?: boolean): boolean {
    const v = this.cache.get(key);
    return v !== undefined ? v === 'true' : (defaultValue ?? DEFAULTS[key] === 'true');
  }

  async set(key: string, value: string, description?: string): Promise<void> {
    await this.repo.upsert({ key, value, description: description ?? null }, ['key']);
    this.cache.set(key, value);
  }

  getAll(): Record<string, string> {
    const result = { ...DEFAULTS };
    for (const [k, v] of this.cache) result[k] = v;
    return result;
  }
}
