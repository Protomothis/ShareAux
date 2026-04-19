import { ApiProperty } from '@nestjs/swagger';

export class QuotaResponse {
  @ApiProperty() used!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() windowMin!: number;
  @ApiProperty() unlimited!: boolean;
  @ApiProperty() banned!: boolean;
  @ApiProperty({ type: [String], description: '신청 불가 sourceId 목록 (큐 + 현재재생 + 쿨다운)' })
  blockedSourceIds!: string[];
}
