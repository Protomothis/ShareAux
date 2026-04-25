import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

import { Language } from '../../types/language.enum.js';

export class SubscribePushDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  auth!: string;

  @ApiProperty({ enum: Language, enumName: 'Language' })
  @IsEnum(Language)
  locale!: Language;
}
