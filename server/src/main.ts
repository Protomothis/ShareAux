process.env.TZ = 'UTC';

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module.js';
import { SharedEnums } from './common/dto/shared-enums.schema.js';
import { WsPayloadsSchema } from './common/dto/ws-payloads.schema.js';
import { IS_DEV } from './constants.js';
import { ErrorResponseDto } from './filters/dto/error-response.dto.js';
import { GlobalExceptionFilter } from './filters/http-exception.filter.js';
import { SystemChatMessage } from './rooms/dto/system-chat-message.dto.js';
import { RoomsGateway } from './rooms/rooms.gateway.js';
import { ErrorLogService } from './services/error-log.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: IS_DEV ? ['error', 'warn', 'log', 'debug'] : ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const exceptionFilter = new GlobalExceptionFilter();
  app.useGlobalFilters(exceptionFilter);
  app.enableCors({ origin: config.get<string>('CLIENT_URL', 'http://localhost:3001'), credentials: true });
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  app.setGlobalPrefix('api');

  // Swagger — 프로덕션에서는 비활성화
  if (IS_DEV) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ShareAux API')
      .setDescription('실시간 음악 공유 플랫폼 API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      extraModels: [SharedEnums, WsPayloadsSchema, ErrorResponseDto, SystemChatMessage],
    });
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);

  const gateway = app.get(RoomsGateway);
  const httpServer = app.getHttpServer();
  gateway.attachToServer(httpServer);

  // Wire ErrorLogService into the global exception filter
  const errorLogService = app.get(ErrorLogService);
  exceptionFilter.setErrorLogService(errorLogService);

  const logger = new Logger('Bootstrap');
  logger.log(`Server running on port ${port}`);
  logger.log(`Swagger: http://localhost:${port}/api/docs`);

  const googleEnabled = !!(config.get('GOOGLE_CLIENT_ID') && config.get('GOOGLE_CLIENT_SECRET'));
  const captchaEnabled = config.get('CAPTCHA_ENABLED') === 'true';
  logger.log(`Google OAuth: ${googleEnabled ? '✅ 활성' : '⬚ 비활성 (GOOGLE_CLIENT_ID/SECRET 미설정)'}`);
  logger.log(`CAPTCHA (PoW): ${captchaEnabled ? '✅ 활성' : '⬚ 비활성'}`);

  const translationEnabled = !!config.get('GEMINI_API_KEY');
  logger.log(`번역 (Gemini): ${translationEnabled ? '✅ 활성' : '⬚ 비활성'}`);
}
void bootstrap();
