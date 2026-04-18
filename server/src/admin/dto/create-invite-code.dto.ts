import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

import { Permission } from '../../types/index.js';

export class CreateInviteCodeDto {
  @ApiProperty({ required: false, minLength: 6, maxLength: 12 })
  @ValidateIf((o: CreateInviteCodeDto) => !!o.code)
  @IsString()
  @Length(6, 12)
  code?: string;

  @ApiProperty({ minimum: 10, maximum: 100 })
  @IsInt()
  @Min(10)
  @Max(100)
  maxUses!: number;

  @ApiProperty({ enum: Permission, isArray: true })
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions!: Permission[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  allowRegistration?: boolean;
}
