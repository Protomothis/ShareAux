import { ApiProperty } from '@nestjs/swagger';

export class LyricsResponse {
  @ApiProperty({ nullable: true }) syncedLyrics!: string | null;
  @ApiProperty({ nullable: true }) lang!: string | null;
  @ApiProperty({ nullable: true }) ruby!: string | null;
  @ApiProperty({ nullable: true }) translated!: string | null;
  @ApiProperty({ nullable: true }) transStatus!: string | null;
}
