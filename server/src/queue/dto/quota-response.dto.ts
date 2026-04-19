import { ApiProperty } from '@nestjs/swagger';

export class QuotaResponse {
  @ApiProperty() used!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() windowMin!: number;
  @ApiProperty() unlimited!: boolean;
  @ApiProperty() banned!: boolean;
  @ApiProperty({ type: [String], description: '쿨다운 중인 sourceId 목록' })
  cooldownSourceIds!: string[];
}
