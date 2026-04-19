import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Post,
  Put,
  Req,
  Res,
  UseFilters,
  UseGuards,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { AUTH_COOKIE_REFRESH, AUTH_LOGIN_RATE_LIMIT, THROTTLE_TTL_MS, WS_CLOSE_ACCOUNT_DELETED } from '../constants.js';
import { AppException } from '../exceptions/app.exception.js';
import { CaptchaService } from '../captcha/captcha.module.js';
import { User } from '../entities/user.entity.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RoomsGateway } from '../rooms/rooms.gateway.js';
import { TranslationService } from '../services/translation.service.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { ErrorCode } from '../types/index.js';
import { OAuthExceptionFilter } from './oauth-exception.filter.js';
import { AuthService } from './auth.service.js';
import { clearAuthCookies, setAuthCookies } from './cookie.util.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { GuestLoginDto } from './dto/guest-login.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { AuthConfigResponse } from './dto/auth-config-response.dto.js';
import { UpdateNicknameDto } from './dto/update-nickname.dto.js';
import { UpdatePasswordDto } from './dto/update-password.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly isProd: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly captcha: CaptchaService,
    private readonly translationService: TranslationService,
    @Inject(forwardRef(() => RoomsGateway)) private readonly gateway: RoomsGateway,
  ) {
    this.isProd = config.get('NODE_ENV') === 'production';
  }

  private get isGoogleEnabled() {
    return !!(this.config.get<string>('GOOGLE_CLIENT_ID') && this.config.get<string>('GOOGLE_CLIENT_SECRET'));
  }

  @Get('config')
  @ApiOperation({ summary: '인증 설정 (Google/CAPTCHA 활성 여부)' })
  @ApiOkResponse({ type: AuthConfigResponse })
  getAuthConfig() {
    return {
      google: this.isGoogleEnabled,
      captcha: this.captcha.isEnabled(),
      translation: this.translationService.isEnabled,
    };
  }

  private verifyCaptcha(dto: { captchaId?: string; captchaAnswer?: string }) {
    if (!this.captcha.isEnabled()) return;
    if (!dto.captchaId || !dto.captchaAnswer) throw new AppException(ErrorCode.CAPTCHA_001);
    if (!this.captcha.validate(dto.captchaId, dto.captchaAnswer)) throw new AppException(ErrorCode.CAPTCHA_002);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth 로그인 시작' })
  googleLogin() {
    if (!this.isGoogleEnabled) throw new AppException(ErrorCode.AUTH_015);
  }

  @Get('link-google')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Google 계정 연동 시작' })
  startLinkGoogle(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    if (!this.isGoogleEnabled) throw new AppException(ErrorCode.AUTH_015);
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID', '');
    const callbackUrl =
      this.config.get<string>('GOOGLE_CALLBACK_URL', '') || 'http://localhost:3000/api/auth/google/callback';
    const state = `link:${req.user.userId}`;
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&response_type=code&scope=openid%20email%20profile` +
      `&state=${encodeURIComponent(state)}`;
    res.redirect(url);
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @UseFilters(new OAuthExceptionFilter())
  @ApiOperation({ summary: 'Google OAuth 콜백' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const clientUrl = this.config.get<string>('CLIENT_URL', 'http://localhost:3001');

    // 연동 완료 시 별도 redirect
    if ((req as unknown as Record<string, unknown>).googleLinked) {
      res.redirect(`${clientUrl}/auth/callback?linked=true`);
      return;
    }
    const tokens = await this.authService.generateTokenPair(req.user as User);
    // 쿠키는 cross-origin에서 안 붙으므로 일회용 코드로 전달 → 클라이언트가 exchange 호출
    res.redirect(`${clientUrl}/auth/callback?code=${encodeURIComponent(tokens.accessToken)}`);
  }

  @Post('exchange')
  @ApiOperation({ summary: 'OAuth 코드 → 쿠키 교환' })
  @ApiBody({ schema: { properties: { code: { type: 'string' } } } })
  async exchange(@Body('code') code: string, @Res({ passthrough: true }) res: Response) {
    // code는 실제로 accessToken — verify 후 쿠키 설정
    let payload: { sub: string };
    try {
      payload = this.authService.verifyToken(code);
    } catch {
      res.status(401).json({ message: 'Invalid code' });
      return;
    }
    const user = await this.authService.findUserById(payload.sub);
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }
    const tokens = await this.authService.generateTokenPair(user);
    setAuthCookies(res, this.isProd, tokens.accessToken, tokens.refreshToken, tokens.user);
    return { ok: true };
  }

  @Post('refresh')
  @ApiOperation({ summary: '토큰 갱신 (쿠키 기반)' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE_REFRESH];
    if (!token) {
      res.status(401).json({ message: 'No refresh token' });
      return;
    }
    const tokens = await this.authService.refreshTokens(token);
    setAuthCookies(res, this.isProd, tokens.accessToken, tokens.refreshToken, tokens.user);
    return { ok: true };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '로그아웃 (쿠키 삭제 + refresh token 무효화)' })
  @ApiBearerAuth()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE_REFRESH];
    if (refreshToken) await this.authService.revokeRefreshToken(refreshToken);
    clearAuthCookies(res, this.isProd);
    return { ok: true };
  }

  @Post('guest')
  @Throttle({ default: { ttl: THROTTLE_TTL_MS, limit: AUTH_LOGIN_RATE_LIMIT } })
  @ApiOperation({ summary: '초대코드로 게스트 입장' })
  @ApiOkResponse({ schema: { properties: { accessToken: { type: 'string' } } } })
  async guestLogin(@Body() dto: GuestLoginDto, @Res({ passthrough: true }) res: Response) {
    this.verifyCaptcha(dto);
    const tokens = await this.authService.guestLogin(dto.code, dto.nickname);
    setAuthCookies(res, this.isProd, tokens.accessToken, '', tokens.user);
    return { ok: true };
  }

  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: '회원가입 (초대코드 필요)' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    this.verifyCaptcha(dto);
    const tokens = await this.authService.register(dto);
    setAuthCookies(res, this.isProd, tokens.accessToken, tokens.refreshToken, tokens.user);
    return { user: tokens.user };
  }

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: '로그인' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    this.verifyCaptcha(dto);
    const tokens = await this.authService.login(dto);
    setAuthCookies(res, this.isProd, tokens.accessToken, tokens.refreshToken, tokens.user);
    return { user: tokens.user };
  }

  @Put('profile/nickname')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '닉네임 변경' })
  async updateNickname(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: UpdateNicknameDto,
  ) {
    await this.authService.updateNickname(req.user.userId, dto.nickname);
    // sau 쿠키 갱신
    const user = await this.authService.findUserById(req.user.userId);
    if (user) {
      res.cookie('sau', JSON.stringify({ sub: user.id, nickname: user.nickname, role: user.role }), {
        secure: this.isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 900_000,
      });
    }
    return { success: true };
  }

  @Put('profile/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '비밀번호 변경' })
  async updatePassword(@Req() req: AuthenticatedRequest, @Body() dto: UpdatePasswordDto) {
    await this.authService.updatePassword(req.user.userId, dto.currentPassword, dto.newPassword);
    return { success: true };
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '회원 탈퇴' })
  async deleteAccount(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: DeleteAccountDto,
  ) {
    const valid = await this.authService.verifyPassword(req.user.userId, dto.password);
    if (!valid) throw new AppException(ErrorCode.AUTH_019);

    this.gateway.disconnectUser(req.user.userId, WS_CLOSE_ACCOUNT_DELETED);
    await this.authService.deleteAccount(req.user.userId);
    clearAuthCookies(res, this.isProd);
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '현재 사용자 정보' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: '사용자 정보', type: User })
  me(@Req() req: Request) {
    return req.user;
  }
}
