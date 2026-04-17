import { ApiProperty } from '@nestjs/swagger';

export class BannedIpItem {
  @ApiProperty() id!: string;
  @ApiProperty() ip!: string;
  @ApiProperty({ nullable: true }) reason!: string | null;
  @ApiProperty() bannedBy!: string;
  @ApiProperty({ nullable: true }) bannerNickname!: string | null;
  @ApiProperty({ nullable: true }) expiresAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}

export class PaginatedBannedIpsResponse {
  @ApiProperty({ type: [BannedIpItem] }) items!: BannedIpItem[];
  @ApiProperty() total!: number;
}
