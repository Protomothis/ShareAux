import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { LyricsType } from '../../types/lyrics-type.enum.js';

export class TrackRankingTrackInfo {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  sourceId!: string;

  @ApiPropertyOptional({ nullable: true })
  artist!: string | null;

  @ApiPropertyOptional({ nullable: true })
  songTitle!: string | null;

  @ApiPropertyOptional({ nullable: true })
  songArtist!: string | null;

  @ApiPropertyOptional({ nullable: true })
  songAlbum!: string | null;

  @ApiProperty({ enum: ['searching', 'found', 'not_found'] })
  lyricsStatus!: 'searching' | 'found' | 'not_found';

  @ApiPropertyOptional({ nullable: true })
  lyricsLang!: string | null;

  @ApiProperty({ enum: ['pending', 'done'] })
  metaStatus!: 'pending' | 'done';

  @ApiPropertyOptional({ enum: LyricsType, nullable: true })
  lyricsType!: LyricsType | null;

  @ApiProperty({ description: '번역 가사 존재 여부' })
  hasTranslation!: boolean;
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
