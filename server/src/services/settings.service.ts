import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { decrypt, encrypt, mask } from '../common/crypto.util.js';
import { SystemSetting } from '../entities/system-setting.entity.js';
import { OptionKey, OPTION_METAS } from '../types/settings.types.js';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private readonly cache = new Map<string, string>();
  private jwtSecret!: string;
  private readyCallbacks: (() => Promise<void>)[] = [];

  constructor(
    @InjectRepository(SystemSetting) private readonly repo: Repository<SystemSetting>,
    private readonly config: ConfigService,
  ) {}

  /** .env → DB 시딩 매핑 */
  private readonly ENV_SEEDS: [string, OptionKey][] = [
    ['CAPTCHA_ENABLED', OptionKey.CaptchaEnabled],
    ['GOOGLE_CLIENT_ID', OptionKey.GoogleClientId],
    ['GOOGLE_CLIENT_SECRET', OptionKey.GoogleClientSecret],
    ['GOOGLE_CALLBACK_URL', OptionKey.GoogleCallbackUrl],
    ['GEMINI_API_KEY', OptionKey.GeminiApiKey],
  ];

  async onModuleInit(): Promise<void> {
    this.jwtSecret = this.config.get<string>('JWT_SECRET', '');

    // DB에서 로드
    const rows = await this.repo.find();
    for (const r of rows) {
      const meta = OPTION_METAS[r.key as OptionKey];
      // 시크릿은 복호화해서 캐시
      if (meta?.secret) {
        try {
          this.cache.set(r.key, decrypt(r.value, this.jwtSecret));
        } catch {
          this.logger.warn(`Failed to decrypt ${r.key} — skipping`);
        }
      } else {
        this.cache.set(r.key, r.value);
      }
    }

    // .env 시딩 — DB에 없으면 .env 값 저장
    for (const [envKey, optionKey] of this.ENV_SEEDS) {
      const envVal = this.config.get<string>(envKey);
      if (envVal && !this.cache.has(optionKey)) {
        await this.set(optionKey, envVal);
        this.logger.log(`Seeded ${optionKey} from .env`);
      }
    }

    this.logger.log(`Loaded ${rows.length} system settings`);

    // 의존 서비스 초기화 트리거
    for (const cb of this.readyCallbacks) await cb();
    this.readyCallbacks = [];
  }

  /** SettingsService 초기화 완료 후 콜백 등록 */
  onReady(cb: () => Promise<void>): void {
    this.readyCallbacks.push(cb);
  }

  // ─── Getters ───────────────────────────────────────

  get(key: OptionKey | string, fallback?: string): string {
    return this.cache.get(key) ?? fallback ?? OPTION_METAS[key as OptionKey]?.defaultValue ?? '';
  }

  getNumber(key: OptionKey | string, fallback?: number): number {
    const v = this.cache.get(key);
    if (v !== undefined) return Number(v);
    return (fallback ?? Number(OPTION_METAS[key as OptionKey]?.defaultValue)) || 0;
  }

  getBoolean(key: OptionKey | string, fallback?: boolean): boolean {
    const v = this.cache.get(key);
    if (v !== undefined) return v === 'true';
    return fallback ?? OPTION_METAS[key as OptionKey]?.defaultValue === 'true';
  }

  // ─── Write ─────────────────────────────────────────

  async set(key: string, value: string): Promise<void> {
    const meta = OPTION_METAS[key as OptionKey];
    const dbValue = meta?.secret ? encrypt(value, this.jwtSecret) : value;
    await this.repo.upsert({ key, value: dbValue, description: null }, ['key']);
    this.cache.set(key, value); // 캐시에는 평문
  }

  // ─── Validation ────────────────────────────────────

  validate(key: string, value: string): string | null {
    const meta = OPTION_METAS[key as OptionKey];
    if (!meta) return `Unknown option key: ${key}`;
    if (meta.secret) return null; // 시크릿은 문자열이면 OK
    if (meta.type === 'boolean' && value !== 'true' && value !== 'false') return `${key}: must be "true" or "false"`;
    if (meta.type === 'number') {
      const n = Number(value);
      if (isNaN(n)) return `${key}: must be a number`;
      if (meta.min !== undefined && n < meta.min) return `${key}: min ${meta.min}`;
      if (meta.max !== undefined && n > meta.max) return `${key}: max ${meta.max}`;
    }
    return null;
  }

  // ─── Bulk Read ─────────────────────────────────────

  /** 일반 설정 — 시크릿 제외 */
  getAll(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of Object.values(OptionKey)) {
      if (OPTION_METAS[key].secret) continue;
      result[key] = this.cache.get(key) ?? OPTION_METAS[key].defaultValue;
    }
    return result;
  }

  /** 시크릿 설정 — 마스킹된 값 반환 */
  getSecrets(): Record<string, { masked: string; configured: boolean }> {
    const result: Record<string, { masked: string; configured: boolean }> = {};
    for (const key of Object.values(OptionKey)) {
      if (!OPTION_METAS[key].secret) continue;
      const val = this.cache.get(key);
      result[key] = { masked: val ? mask(val) : '', configured: !!val };
    }
    return result;
  }

  /** 시크릿 평문 조회 (서버 내부용) */
  getSecret(key: OptionKey): string {
    const cached = this.cache.get(key);
    if (cached) return cached;
    // 시딩 전 fallback — .env에서 직접 조회
    for (const [envKey, optionKey] of this.ENV_SEEDS) {
      if (optionKey === key) return this.config.get<string>(envKey) ?? '';
    }
    return '';
  }
}
