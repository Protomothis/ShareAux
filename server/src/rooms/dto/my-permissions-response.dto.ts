import { ApiProperty } from '@nestjs/swagger';

import { Permission } from '../../types/permission.enum.js';

export class MyPermissionsResponse {
  @ApiProperty({ enum: Permission, isArray: true, description: '최종 유효 권한 (account ∩ room)' })
  permissions!: Permission[];

  @ApiProperty({ enum: Permission, isArray: true, description: '계정 레벨 권한' })
  accountPermissions!: Permission[];

  @ApiProperty({ enum: Permission, isArray: true, description: '방 레벨 권한' })
  roomPermissions!: Permission[];
}
