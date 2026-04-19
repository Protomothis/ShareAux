import { ApiProperty } from '@nestjs/swagger';

export class SearchResultItem {
  @ApiProperty({ default: 'yt' })
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
