import { ApiProperty } from '@nestjs/swagger';

export class BanInfo {
  @ApiProperty() userId!: string;
  @ApiProperty() nickname!: string;
  @ApiProperty() bannedAt!: string;
}
