import { ApiPropertyOptional } from '@nestjs/swagger';

export class TrackLyricsResponse {
  @ApiPropertyOptional({ nullable: true })
  synced!: string | null;

  @ApiPropertyOptional({ nullable: true })
  translated!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lang!: string | null;
}
