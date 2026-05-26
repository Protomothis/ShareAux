import { ApiProperty } from '@nestjs/swagger';

import { Provider } from '../../types/provider.enum.js';

export class SearchResultItem {
  @ApiProperty({ enum: Provider, enumName: 'Provider', default: Provider.YT })
  provider!: string;

  @ApiProperty()
  sourceId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  artist!: string;

  @ApiProperty({ nullable: true })
  thumbnail!: string;

  @ApiProperty()
  durationMs!: number;

  @ApiProperty({ required: false })
  isOfficial?: boolean;

  @ApiProperty({ required: false })
  views?: number;
}
