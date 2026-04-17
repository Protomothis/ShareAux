import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { IpBanService } from '../services/ip-ban.service.js';

@Injectable()
export class IpBanMiddleware implements NestMiddleware {
  constructor(private readonly ipBanService: IpBanService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (req.ip && this.ipBanService.isIpBanned(req.ip)) {
      res.status(403).json({ message: 'IP가 차단되었습니다' });
      return;
    }
    next();
  }
}
