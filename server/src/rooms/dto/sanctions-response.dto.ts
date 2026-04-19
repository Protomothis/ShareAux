import { ApiProperty } from '@nestjs/swagger';

export class SanctionItem {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() nickname!: string;
  @ApiProperty() type!: 'ban' | 'mute';
  @ApiProperty({ required: false }) reason?: string;
  @ApiProperty({ required: false }) bannedAt?: Date;
  @ApiProperty({ required: false }) expiresAt?: Date;
  @ApiProperty({ required: false }) remainingSec?: number;
  @ApiProperty({ required: false }) level?: number;
}

export class SanctionsResponse {
  @ApiProperty({ type: [SanctionItem] }) bans!: SanctionItem[];
  @ApiProperty({ type: [SanctionItem] }) mutes!: SanctionItem[];
}

export class ResetBansResponse {
  @ApiProperty() ok!: boolean;
  @ApiProperty() cleared!: number;
}
