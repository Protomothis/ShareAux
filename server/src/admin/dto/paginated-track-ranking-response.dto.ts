import { ApiProperty } from '@nestjs/swagger';

import { TrackRankingItem } from './track-ranking-item.dto.js';

export class PaginatedTrackRankingResponse {
  @ApiProperty({ type: [TrackRankingItem] })
  items!: TrackRankingItem[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
