import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

import { UserRole } from '../../types/user-role.enum.js';

export class UpdateRoleDto {
  @ApiProperty({ enum: [UserRole.User, UserRole.Admin] })
  @IsString()
  @IsIn([UserRole.User, UserRole.Admin])
  role!: UserRole;
}
