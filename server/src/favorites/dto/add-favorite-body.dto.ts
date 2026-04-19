import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

import { Provider } from '../../types/provider.enum.js';

export class AddFavoriteBody {
  @ApiProperty({ enum: Provider })
  @IsEnum(Provider)
  provider!: Provider;

  @ApiProperty()
  @IsString()
  sourceId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  artist?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  durationMs!: number;
}
