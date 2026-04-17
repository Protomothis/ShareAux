import { ApiProperty } from '@nestjs/swagger';

export class ErrorLogItem {
  @ApiProperty() timestamp!: number;
  @ApiProperty() method!: string;
  @ApiProperty() path!: string;
  @ApiProperty() status!: number;
  @ApiProperty() message!: string;
  @ApiProperty({ required: false }) stack?: string;
  @ApiProperty({ required: false }) userId?: string;
}

export class PaginatedErrorLogsResponse {
  @ApiProperty({ type: [ErrorLogItem] }) items!: ErrorLogItem[];
  @ApiProperty() total!: number;
}

export class ErrorFileItem {
  @ApiProperty() filename!: string;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty() errorCount!: number;
}
