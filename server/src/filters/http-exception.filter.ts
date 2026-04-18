import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Injectable, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

import { ERROR_META } from '../constants.js';
import { AppException } from '../exceptions/app.exception.js';
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

    // AppException → 구조화된 에러 응답
    if (exception instanceof AppException) {
      const meta = ERROR_META[exception.errorCode];
      const status = meta.httpStatus;

      this.logError(req, status, meta.description, exception);

      res.status(status).json({
        success: false,
        code: meta.code,
        title: meta.title,
        description: meta.description,
        statusCode: status,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 기존 HttpException (ValidationPipe 등) fallback
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const response = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const message =
      typeof response === 'string' ? response : ((response as Record<string, unknown>).message ?? response);

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.message : exception,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    this.logError(req, status, typeof message === 'string' ? message : JSON.stringify(message), exception);

    res.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private logError(req: Request, status: number, message: string, exception: unknown): void {
    const user = (req as unknown as Record<string, unknown>)?.user as Record<string, string> | undefined;
    this.errorLogService
      ?.log({
        timestamp: Date.now(),
        method: req?.method ?? '',
        path: req?.url ?? '',
        status,
        message,
        stack: exception instanceof Error ? exception.stack?.slice(0, 500) : undefined,
        userId: user?.userId,
      })
      .catch(() => {});
  }
}
