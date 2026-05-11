import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class AutoDjTagsDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) mood!: string[];
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) genre!: string[];
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) era!: string[];
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) country!: string[];
  @ApiProperty({ default: 'neutral' }) @IsString() @IsOptional() taste?: string;
}
