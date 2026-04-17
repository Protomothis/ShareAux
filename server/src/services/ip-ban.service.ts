import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BannedIp } from '../entities/banned-ip.entity.js';

@Injectable()
export class IpBanService implements OnModuleInit {
  private readonly logger = new Logger(IpBanService.name);
  private readonly cache = new Map<string, Date | null>(); // ip → expiresAt

  constructor(@InjectRepository(BannedIp) private readonly repo: Repository<BannedIp>) {}

  async onModuleInit(): Promise<void> {
    const bans = await this.repo.find();
    for (const ban of bans) {
      this.cache.set(ban.ip, ban.expiresAt);
    }
    this.logger.log(`Loaded ${this.cache.size} IP bans into cache`);
  }

  isIpBanned(ip: string): boolean {
    const expiresAt = this.cache.get(ip);
    if (expiresAt === undefined) return false;
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      this.cache.delete(ip);
      return false;
    }
    return true;
  }

  async banIp(ip: string, reason: string | null, bannedBy: string, expiresAt?: Date): Promise<BannedIp> {
    const ban = await this.repo.save(this.repo.create({ ip, reason, bannedBy, expiresAt: expiresAt ?? null }));
    this.cache.set(ip, expiresAt ?? null);
    return ban;
  }

  async unbanIp(id: string): Promise<void> {
    const ban = await this.repo.findOneBy({ id });
    if (ban) {
      this.cache.delete(ban.ip);
      await this.repo.delete(id);
    }
  }

  async getAll(page: number, limit: number): Promise<{ items: BannedIp[]; total: number }> {
    const [items, total] = await this.repo.findAndCount({
      relations: ['banner'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }
}
