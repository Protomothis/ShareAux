import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import { CaptchaFields } from './captcha-fields.dto.js';

export class LoginDto extends CaptchaFields {
  @ApiProperty({ description: '아이디' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ description: '비밀번호' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
