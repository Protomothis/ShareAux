import { ApiProperty } from '@nestjs/swagger';

import { RoomMember } from '../../entities/room-member.entity.js';
import { RoomPermission } from '../../entities/room-permission.entity.js';

export class MemberWithPermission extends RoomMember {
  @ApiProperty({ type: () => RoomPermission, nullable: true })
  permission!: RoomPermission | null;
}
