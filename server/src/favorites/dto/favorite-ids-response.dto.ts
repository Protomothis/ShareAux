import { ApiProperty } from '@nestjs/swagger';

export class FavoriteIdsResponse {
  @ApiProperty({ type: [String] })
  sourceIds!: string[];
}
