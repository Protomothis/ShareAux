import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CaptchaModule } from '../captcha/captcha.module.js';
import { InviteCode } from '../entities/invite-code.entity.js';
import { RefreshToken } from '../entities/refresh-token.entity.js';
import { User } from '../entities/user.entity.js';
import { RoomsModule } from '../rooms/rooms.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { GoogleStrategy } from './strategies/google.strategy.js';

const googleProvider = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [GoogleStrategy] : [];

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '6h') },
      }),
    }),
    TypeOrmModule.forFeature([User, InviteCode, RefreshToken]),
    forwardRef(() => RoomsModule),
    CaptchaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ...googleProvider],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
