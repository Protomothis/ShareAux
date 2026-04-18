import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppException } from '../exceptions/app.exception.js';
import { Room } from '../entities/room.entity.js';
import { ErrorCode } from '../types/error-code.enum.js';

@Injectable()
export class ControllerGuard implements CanActivate {
  constructor(private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId: string = req.user?.userId;
    const roomId: string = req.params?.roomId ?? req.params?.id;
    if (!userId || !roomId) throw new AppException(ErrorCode.ROOM_016);

    const room = await this.dataSource.getRepository(Room).findOneBy({ id: roomId });
    if (room?.hostId === userId) return true;

    throw new AppException(ErrorCode.ROOM_016);
  }
}
