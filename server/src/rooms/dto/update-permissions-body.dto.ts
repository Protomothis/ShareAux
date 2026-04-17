import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { Permission } from '../../types/permission.enum.js';

export class UpdatePermissionsBody {
  @ApiProperty({ enum: Permission, isArray: true })
  @IsEnum(Permission, { each: true })
  permissions!: Permission[];
}
