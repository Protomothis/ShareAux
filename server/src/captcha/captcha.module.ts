import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InMemoryCaptchaService, WoodallAliases } from '@p-captcha/node';

import { CAPTCHA_DIFFICULTY, CAPTCHA_ROUNDS } from '../constants.js';
import { SettingsService } from '../services/settings.service.js';
import { OptionKey } from '../types/settings.types.js';
import { CaptchaChallengeResponse } from './dto/captcha-challenge-response.dto.js';

@Injectable()
export class CaptchaService {
  private readonly pow = new InMemoryCaptchaService();

  constructor(private readonly settings: SettingsService) {}

  isEnabled(): boolean {
    return this.settings.getBoolean(OptionKey.CaptchaEnabled);
  }

  generateChallenge() {
    return this.pow.generateChallenge('QuadraticResidueProblem', {
      woodall: WoodallAliases[CAPTCHA_DIFFICULTY],
      rounds: CAPTCHA_ROUNDS,
    });
  }

  validate(id: string, answer: string): boolean {
    return this.pow.validateAnswer(id, answer);
  }
}

@ApiTags('captcha')
@Controller('captcha')
class CaptchaController {
  constructor(private readonly captcha: CaptchaService) {}

  @Get('challenge')
  @ApiOperation({ summary: 'PoW 챌린지 생성' })
  @ApiOkResponse({ type: CaptchaChallengeResponse })
  getChallenge() {
    if (!this.captcha.isEnabled()) {
      return { enabled: false };
    }
    const result = this.captcha.generateChallenge();
    return { enabled: true, ...result };
  }
}

import { ServicesModule } from '../services/services.module.js';

@Module({
  imports: [ServicesModule],
  controllers: [CaptchaController],
  providers: [CaptchaService],
  exports: [CaptchaService],
})
export class CaptchaModule {}
