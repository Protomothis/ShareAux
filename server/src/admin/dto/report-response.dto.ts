import { ApiProperty } from '@nestjs/swagger';

import { ReportStatus } from '../../types/index.js';

export class ReportItem {
  @ApiProperty() id!: string;
  @ApiProperty() reporterId!: string;
  @ApiProperty({ nullable: true }) reporterNickname!: string | null;
  @ApiProperty() targetType!: string;
  @ApiProperty() targetId!: string;
  @ApiProperty() reason!: string;
  @ApiProperty({ nullable: true }) details!: string | null;
  @ApiProperty({ enum: ReportStatus, enumName: 'ReportStatus' }) status!: ReportStatus;
  @ApiProperty({ nullable: true }) resolvedBy!: string | null;
  @ApiProperty({ nullable: true }) resolvedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}

export class PaginatedReportsResponse {
  @ApiProperty({ type: [ReportItem] }) items!: ReportItem[];
  @ApiProperty() total!: number;
}
