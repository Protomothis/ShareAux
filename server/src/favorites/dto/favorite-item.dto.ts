import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Provider } from '../../types/provider.enum.js';

export class FavoriteItem {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: Provider })
  provider!: Provider;

  @ApiProperty()
  sourceId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  artist!: string | null;

  @ApiPropertyOptional({ nullable: true })
  thumbnail!: string | null;

  @ApiProperty()
  durationMs!: number;

  @ApiPropertyOptional({ nullable: true })
  folderId!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
