import { ApiProperty } from '@nestjs/swagger';

export class TableSizeItem {
  @ApiProperty() name!: string;
  @ApiProperty() sizeMB!: number;
}

export class CleanupSummaryResponse {
  @ApiProperty() totalTracks!: number;
  @ApiProperty() totalPlayHistories!: number;
  @ApiProperty() activeRooms!: number;
  @ApiProperty() inactiveRooms!: number;
  @ApiProperty() totalUsers!: number;
  @ApiProperty() guestUsers!: number;
  @ApiProperty() lyricsFoundTracks!: number;
  @ApiProperty() totalQueueItems!: number;
  @ApiProperty() unplayedTracks!: number;
  @ApiProperty() staleTracksCount!: number;
  @ApiProperty() oldHistories30d!: number;
  @ApiProperty() inactiveRooms7d!: number;
  @ApiProperty() emptyInactiveRooms!: number;
  @ApiProperty() expiredGuests!: number;
  @ApiProperty() inactiveGuests30d!: number;
  @ApiProperty({ type: [TableSizeItem] }) tableSizes!: TableSizeItem[];
}
