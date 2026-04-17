import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReportDto {
  @ApiProperty() @IsString() targetType!: string;
  @ApiProperty() @IsString() targetId!: string;
  @ApiProperty() @IsString() @MaxLength(500) reason!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(2000) details?: string;
}
