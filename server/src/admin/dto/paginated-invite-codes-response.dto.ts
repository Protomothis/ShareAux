import { ApiProperty } from '@nestjs/swagger';

import { InviteCode } from '../../entities/invite-code.entity.js';

export class PaginatedInviteCodesResponse {
  @ApiProperty({ type: [InviteCode] })
  items!: InviteCode[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
