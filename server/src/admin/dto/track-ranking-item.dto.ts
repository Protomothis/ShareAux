import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackRankingTrackInfo {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  sourceId!: string;

  @ApiPropertyOptional({ nullable: true })
  songArtist!: string | null;
}

export class TrackRankingItem {
  @ApiProperty()
  trackId!: string;

  @ApiProperty()
  totalPlays!: number;

  @ApiProperty()
  uniqueUsers!: number;

  @ApiProperty()
  likes!: number;

  @ApiProperty()
  dislikes!: number;

  @ApiProperty({ type: 'number' })
  score!: number;

  @ApiProperty({ type: TrackRankingTrackInfo })
  track!: TrackRankingTrackInfo;
}
