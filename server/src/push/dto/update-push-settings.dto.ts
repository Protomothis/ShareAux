import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePushSettingsDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  trackChanged?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  voteSkip?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hostChanged?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  mention?: boolean;
}
