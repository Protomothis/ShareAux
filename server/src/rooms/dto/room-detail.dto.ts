import { ApiProperty } from '@nestjs/swagger';

import { Room } from '../../entities/room.entity.js';
import { RoomPlayback } from '../../entities/room-playback.entity.js';
import { MemberWithPermission } from './member-with-permission.dto.js';

export class RoomDetail extends Room {
  @ApiProperty({ type: () => [MemberWithPermission] })
  members!: MemberWithPermission[];

  @ApiProperty({ type: () => RoomPlayback, nullable: true })
  playback!: RoomPlayback | null;
}
