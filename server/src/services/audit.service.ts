import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { Repository } from 'typeorm';

import { AuditLog } from '../entities/audit-log.entity.js';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async log(
    actorId: string,
    action: string,
    targetType: string,
    targetId: string | null,
    details?: Record<string, unknown>,
    ip?: string,
  ): Promise<void> {
    await this.repo.save(
      this.repo.create({
        actorId,
        action,
        targetType,
        targetId: targetId ?? null,
        details: details ?? null,
        ip: ip ?? null,
      }),
    );
  }

  async getAuditLogs(
    page: number,
    limit: number,
    filters?: { action?: string; targetType?: string },
  ): Promise<{ items: AuditLog[]; total: number }> {
    const where: FindOptionsWhere<AuditLog> = {};
    if (filters?.action) where.action = filters.action;
    if (filters?.targetType) where.targetType = filters.targetType;

    const [items, total] = await this.repo.findAndCount({
      where,
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }
}
