import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import {
  AUTH_NICKNAME_MAX,
  AUTH_NICKNAME_MIN,
  AUTH_PASSWORD_MAX,
  AUTH_PASSWORD_MIN,
  AUTH_USERNAME_MAX,
  AUTH_USERNAME_MIN,
} from '../../constants.js';
import { CaptchaFields } from './captcha-fields.dto.js';

export class RegisterDto extends CaptchaFields {
  @ApiProperty({ description: '초대코드 (첫 유저는 생략 가능)', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    description: '아이디 (영소문자, 숫자, 언더스코어)',
    minLength: AUTH_USERNAME_MIN,
    maxLength: AUTH_USERNAME_MAX,
  })
  @IsString()
  @MinLength(AUTH_USERNAME_MIN)
  @MaxLength(AUTH_USERNAME_MAX)
  @Matches(/^[a-z0-9_]+$/, { message: '아이디는 영소문자, 숫자, 언더스코어만 사용 가능합니다' })
  username!: string;

  @ApiProperty({ description: '비밀번호', minLength: AUTH_PASSWORD_MIN, maxLength: AUTH_PASSWORD_MAX })
  @IsString()
  @MinLength(AUTH_PASSWORD_MIN)
  @MaxLength(AUTH_PASSWORD_MAX)
  password!: string;

  @ApiProperty({ description: '닉네임', minLength: AUTH_NICKNAME_MIN, maxLength: AUTH_NICKNAME_MAX })
  @IsString()
  @MinLength(AUTH_NICKNAME_MIN)
  @MaxLength(AUTH_NICKNAME_MAX)
  nickname!: string;
}
