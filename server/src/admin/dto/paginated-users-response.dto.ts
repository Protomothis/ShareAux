import { ApiProperty } from '@nestjs/swagger';

import { User } from '../../entities/user.entity.js';

export class PaginatedUsersResponse {
  @ApiProperty({ type: [User] })
  items!: User[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
