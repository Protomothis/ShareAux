import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AuthProvider } from '../../types/auth-provider.enum.js';
import { Permission } from '../../types/permission.enum.js';
import { UserRole } from '../../types/user-role.enum.js';

export class RecentTrackItem {
  @ApiProperty()
  trackId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  playCount!: number;

  @ApiProperty()
  lastPlayedAt!: Date;
}

export class UserDetailResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nickname!: string;

  @ApiPropertyOptional({ nullable: true })
  username!: string | null;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty({ enum: AuthProvider })
  provider!: AuthProvider;

  @ApiPropertyOptional({ nullable: true })
  googleId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  bannedAt!: Date | null;

  @ApiProperty({ enum: Permission, isArray: true })
  accountPermissions!: Permission[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  roomCount!: number;

  @ApiProperty()
  totalPlays!: number;

  @ApiProperty({ type: [RecentTrackItem] })
  recentTracks!: RecentTrackItem[];
}
