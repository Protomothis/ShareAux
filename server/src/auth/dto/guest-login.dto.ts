import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

import { CaptchaFields } from './captcha-fields.dto.js';

export class GuestLoginDto extends CaptchaFields {
  @ApiProperty({ minLength: 6, maxLength: 12 })
  @IsString()
  @Length(6, 12)
  code!: string;

  @ApiProperty({ minLength: 1, maxLength: 30 })
  @IsString()
  @Length(1, 30)
  nickname!: string;
}
