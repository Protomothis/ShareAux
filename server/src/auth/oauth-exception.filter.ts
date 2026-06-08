import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

@Catch()
export class OAuthExceptionFilter implements ExceptionFilter {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const clientUrl = this.config.get<string>('CLIENT_URL', 'http://localhost:3001');
    const msg = exception instanceof HttpException ? exception.message : '로그인에 실패했습니다';
    res.redirect(`${clientUrl}/auth/callback?error=${encodeURIComponent(msg)}`);
  }
}
