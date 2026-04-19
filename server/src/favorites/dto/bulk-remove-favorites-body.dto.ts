import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsString } from 'class-validator';

export class BulkRemoveFavoritesBody {
  @ApiProperty({ type: [String] })
  @IsString({ each: true })
  @ArrayMaxSize(200)
  sourceIds!: string[];
}
