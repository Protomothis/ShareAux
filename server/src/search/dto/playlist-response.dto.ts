import { ApiProperty } from '@nestjs/swagger';

export class PlaylistTrackItem {
  @ApiProperty()
  sourceId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  artist!: string | null;

  @ApiProperty({ nullable: true })
  thumbnail!: string | null;

  @ApiProperty()
  durationMs!: number;

  @ApiProperty()
  available!: boolean;
}

export class PlaylistResponse {
  @ApiProperty({ type: [PlaylistTrackItem] })
  tracks!: PlaylistTrackItem[];

  @ApiProperty()
  total!: number;
}
