import type { ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { AppException } from '../exceptions/app.exception.js';
import type { AuthenticatedUser } from '../types/index.js';
import { ErrorCode } from '../types/error-code.enum.js';
import { UserRole } from '../types/index.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Injectable()
export class AdminGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AuthenticatedUser;
    if (user.role !== UserRole.Admin && user.role !== UserRole.SuperAdmin) {
      throw new AppException(ErrorCode.ADMIN_001);
    }
    return true;
  }
}
