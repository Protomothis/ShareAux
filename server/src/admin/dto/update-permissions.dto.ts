import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum } from 'class-validator';

import { Permission } from '../../types/permission.enum.js';

export class UpdatePermissionsDto {
  @ApiProperty({ enum: Permission, enumName: 'Permission', isArray: true })
  @IsArray()
  @IsEnum(Permission, { each: true })
  permissions!: Permission[];
}
