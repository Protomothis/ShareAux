import { ApiProperty } from '@nestjs/swagger';

export class ReportItem {
  @ApiProperty() id!: string;
  @ApiProperty() reporterId!: string;
  @ApiProperty({ nullable: true }) reporterNickname!: string | null;
  @ApiProperty() targetType!: string;
  @ApiProperty() targetId!: string;
  @ApiProperty() reason!: string;
  @ApiProperty({ nullable: true }) details!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) resolvedBy!: string | null;
  @ApiProperty({ nullable: true }) resolvedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
}

export class PaginatedReportsResponse {
  @ApiProperty({ type: [ReportItem] }) items!: ReportItem[];
  @ApiProperty() total!: number;
}
