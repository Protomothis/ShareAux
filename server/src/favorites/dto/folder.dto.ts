import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { FolderColor } from '../../types/folder-color.enum.js';

export class CreateFolderBody {
  @ApiProperty({ minLength: 2, maxLength: 20 })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  name!: string;

  @ApiPropertyOptional({ enum: FolderColor })
  @IsOptional()
  @IsEnum(FolderColor)
  color?: FolderColor;
}

export class UpdateFolderBody {
  @ApiPropertyOptional({ minLength: 2, maxLength: 20 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  name?: string;

  @ApiPropertyOptional({ enum: FolderColor })
  @IsOptional()
  @IsEnum(FolderColor)
  color?: FolderColor;
}

export class FolderItem {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: FolderColor })
  color!: FolderColor;

  @ApiProperty()
  position!: number;

  @ApiProperty()
  trackCount!: number;
}

export class MoveFavoriteBody {
  @ApiPropertyOptional({ nullable: true, description: '이동할 폴더 ID (null = 미분류)' })
  @IsOptional()
  @IsString()
  folderId!: string | null;
}
