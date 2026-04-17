import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Injectable, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

import type { ErrorLogService } from '../services/error-log.service.js';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');
  private errorLogService?: ErrorLogService;

  setErrorLogService(service: ErrorLogService): void {
    this.errorLogService = service;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const message = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const msgStr = typeof message === 'string' ? message : ((message as Record<string, unknown>).message ?? message);

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : exception,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // 에러 로그 기록
    const user = (req as unknown as Record<string, unknown>)?.user as Record<string, string> | undefined;
    this.errorLogService
      ?.log({
        timestamp: Date.now(),
        method: req?.method ?? '',
        path: req?.url ?? '',
        status,
        message: typeof msgStr === 'string' ? msgStr : JSON.stringify(msgStr),
        stack: exception instanceof Error ? exception.stack?.slice(0, 500) : undefined,
        userId: user?.userId,
      })
      .catch(() => {});

    res.status(status).json({
      success: false,
      statusCode: status,
      message: msgStr,
      timestamp: new Date().toISOString(),
    });
  }
}
