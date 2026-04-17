import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { Room } from '../entities/room.entity.js';

@Injectable()
export class ControllerGuard implements CanActivate {
  constructor(private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId: string = req.user?.userId;
    const roomId: string = req.params?.roomId ?? req.params?.id;
    if (!userId || !roomId) throw new ForbiddenException();

    const room = await this.dataSource.getRepository(Room).findOneBy({ id: roomId });
    if (room?.hostId === userId) return true;

    throw new ForbiddenException('Not the DJ');
  }
}
