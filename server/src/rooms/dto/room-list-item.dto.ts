import { ApiProperty } from '@nestjs/swagger';

import { Room } from '../../entities/room.entity.js';
import { RoomPlayback } from '../../entities/room-playback.entity.js';

export class RoomListItem extends Room {
  @ApiProperty()
  memberCount!: number;

  @ApiProperty({ type: [String] })
  memberPreview!: string[];

  @ApiProperty({ type: () => RoomPlayback, nullable: true })
  playback!: RoomPlayback | null;
}
