import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminModule } from './admin/admin.module.js';
import { THROTTLE_LIMIT_DEFAULT, THROTTLE_TTL_MS } from './constants.js';
import { HealthController, SetupController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { CaptchaModule } from './captcha/captcha.module.js';
import { User } from './entities/user.entity.js';
import { IpBanMiddleware } from './middleware/ip-ban.middleware.js';
import { PlayerModule } from './player/player.module.js';
import { QueueModule } from './queue/queue.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { SearchModule } from './search/search.module.js';
import { ServicesModule } from './services/services.module.js';
import { TracksModule } from './tracks/tracks.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../.env'] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: THROTTLE_TTL_MS, limit: THROTTLE_LIMIT_DEFAULT }]),
    ScheduleModule.forRoot(),
    ServicesModule,
    AuthModule,
    CaptchaModule,
    RoomsModule,
    PlayerModule,
    QueueModule,
    SearchModule,
    AdminModule,
    TracksModule,
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [HealthController, SetupController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(IpBanMiddleware).forRoutes('*');
  }
}
