import { ApiProperty } from '@nestjs/swagger';

import { Room } from '../../entities/room.entity.js';

export class AdminRoomItem extends Room {
  @ApiProperty()
  memberCount!: number;
}

export class PaginatedRoomsResponse {
  @ApiProperty({ type: [AdminRoomItem] })
  items!: AdminRoomItem[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
