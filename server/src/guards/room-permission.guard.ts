import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { Room } from '../entities/room.entity.js';
import { RoomPermission } from '../entities/room-permission.entity.js';
import { User } from '../entities/user.entity.js';
import type { Permission } from '../types/permission.enum.js';
import { DEFAULT_ROOM_PERMISSIONS, DEFAULT_USER_PERMISSIONS } from '../types/permission.enum.js';
import { UserRole } from '../types/user-role.enum.js';

export const RequirePermission = (perm: Permission) => SetMetadata('permission', perm);

@Injectable()
export class RoomPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const perm = this.reflector.get<Permission>('permission', context.getHandler());
    if (!perm) return true;

    const req = context.switchToHttp().getRequest();
    const userId: string = req.user?.userId;
    const roomId: string = req.params?.roomId ?? req.params?.id;
    if (!userId || !roomId) throw new ForbiddenException();

    // 호스트는 bypass
    const room = await this.dataSource.getRepository(Room).findOneBy({ id: roomId });
    if (room?.hostId === userId) return true;

    // 계정 권한 (상한선)
    const accountPerms = await this.getAccountPermissions(userId);
    if (!accountPerms.includes(perm)) {
      throw new ForbiddenException('계정 권한이 부족합니다');
    }

    // 방 권한
    const record = await this.dataSource.getRepository(RoomPermission).findOneBy({ roomId, userId });
    const roomPerms = record?.permissions ?? DEFAULT_ROOM_PERMISSIONS;
    if (!roomPerms.includes(perm)) {
      const labels: Partial<Record<Permission, string>> = {
        search: '검색이 금지되었습니다',
        addQueue: '곡 신청이 금지되었습니다',
        host: '호스트 권한이 필요합니다',
        chat: '채팅이 금지되었습니다',
      };
      throw new ForbiddenException(labels[perm] || 'Permission denied');
    }

    return true;
  }

  private async getAccountPermissions(userId: string): Promise<Permission[]> {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId },
      relations: ['inviteCode'],
    });
    if (!user) throw new ForbiddenException();

    if (user.role !== UserRole.Guest) return DEFAULT_USER_PERMISSIONS;

    // 게스트: 초대코드의 permissions
    return (user.inviteCode?.permissions as Permission[] | undefined) ?? [];
  }
}
