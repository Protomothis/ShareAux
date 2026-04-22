process.env.TZ = 'UTC';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { WsEnumsSchema } from './rooms/dto/ws-enums.schema.js';
import helmet from 'helmet';

import { AppModule } from './app.module.js';
import { ErrorLogService } from './services/error-log.service.js';
import { ErrorResponseDto } from './filters/dto/error-response.dto.js';
import { GlobalExceptionFilter } from './filters/http-exception.filter.js';
import { RoomsGateway } from './rooms/rooms.gateway.js';

const required = ['JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env: ${key}`);
    process.exit(1);
  }
}

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create(AppModule, {
    logger: isProd ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug'],
  });
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const exceptionFilter = new GlobalExceptionFilter();
  app.useGlobalFilters(exceptionFilter);
  app.enableCors({ origin: process.env.CLIENT_URL || 'http://localhost:3001', credentials: true });
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  app.setGlobalPrefix('api');

  // Swagger — 프로덕션에서는 비활성화
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ShareAux API')
      .setDescription('실시간 음악 공유 플랫폼 API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config, {
      extraModels: [WsEnumsSchema, ErrorResponseDto],
    });
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT || 3000);

  const gateway = app.get(RoomsGateway);
  const httpServer = app.getHttpServer();
  gateway.attachToServer(httpServer);

  // Wire ErrorLogService into the global exception filter
  const errorLogService = app.get(ErrorLogService);
  exceptionFilter.setErrorLogService(errorLogService);

  const logger = new Logger('Bootstrap');
  logger.log(`Server running on port ${process.env.PORT || 3000}`);
  logger.log(`Swagger: http://localhost:${process.env.PORT || 3000}/api/docs`);

  const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const captchaEnabled = process.env.CAPTCHA_ENABLED === 'true';
  logger.log(`Google OAuth: ${googleEnabled ? '✅ 활성' : '⬚ 비활성 (GOOGLE_CLIENT_ID/SECRET 미설정)'}`);
  logger.log(`CAPTCHA (PoW): ${captchaEnabled ? '✅ 활성' : '⬚ 비활성'}`);

  const translationEnabled = !!process.env.GEMINI_API_KEY;
  logger.log(`번역 (Gemini): ${translationEnabled ? '✅ 활성' : '⬚ 비활성'}`);
}
void bootstrap();
