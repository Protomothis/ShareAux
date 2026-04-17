import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CaptchaFields {
  @ApiPropertyOptional({ description: 'CAPTCHA challenge ID' })
  @IsOptional()
  @IsString()
  captchaId?: string;

  @ApiPropertyOptional({ description: 'CAPTCHA answer' })
  @IsOptional()
  @IsString()
  captchaAnswer?: string;
}
