import { ApiProperty } from '@nestjs/swagger';

export class DailyPlaysItem {
  @ApiProperty() date!: string;
  @ApiProperty() count!: number;
}

export class PlaysMetricsResponse {
  @ApiProperty({ type: [DailyPlaysItem] }) items!: DailyPlaysItem[];
}
