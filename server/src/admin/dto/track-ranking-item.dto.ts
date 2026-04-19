import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackRankingTrackInfo {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  sourceId!: string;

  @ApiPropertyOptional({ nullable: true })
  songArtist!: string | null;

  @ApiProperty({ enum: ['searching', 'found', 'not_found'] })
  lyricsStatus!: 'searching' | 'found' | 'not_found';

  @ApiPropertyOptional({ nullable: true })
  lyricsLang!: string | null;

  @ApiProperty({ enum: ['pending', 'done'] })
  metaStatus!: 'pending' | 'done';
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
