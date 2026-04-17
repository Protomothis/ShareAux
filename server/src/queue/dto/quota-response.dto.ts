import { ApiProperty } from '@nestjs/swagger';

export class QuotaResponse {
  @ApiProperty() used!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() windowMin!: number;
  @ApiProperty() unlimited!: boolean;
  @ApiProperty() banned!: boolean;
}
