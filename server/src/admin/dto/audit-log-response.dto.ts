import { ApiProperty } from '@nestjs/swagger';

export class AuditLogItem {
  @ApiProperty() id!: string;
  @ApiProperty() actorId!: string;
  @ApiProperty({ nullable: true }) actorNickname!: string | null;
  @ApiProperty() action!: string;
  @ApiProperty() targetType!: string;
  @ApiProperty({ nullable: true }) targetId!: string | null;
  @ApiProperty({ nullable: true }) details!: Record<string, unknown> | null;
  @ApiProperty({ nullable: true }) ip!: string | null;
  @ApiProperty() createdAt!: Date;
}

export class PaginatedAuditLogsResponse {
  @ApiProperty({ type: [AuditLogItem] }) items!: AuditLogItem[];
  @ApiProperty() total!: number;
}
