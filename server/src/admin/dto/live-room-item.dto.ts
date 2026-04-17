import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LiveRoomItem {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true, description: 'Audio codec (e.g. aac)' })
  codec?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Bitrate in kbps' })
  bitrate?: number;

  @ApiProperty()
  isStreaming!: boolean;
}
