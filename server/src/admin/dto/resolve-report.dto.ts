import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { ReportStatus } from '../../types/report-status.enum.js';

export class ResolveReportDto {
  @ApiProperty({ enum: ReportStatus, enumName: 'ReportStatus' })
  @IsEnum(ReportStatus)
  status!: ReportStatus;
}
