import { ApiProperty } from '@nestjs/swagger';

export class MetricsPointDto {
  @ApiProperty() timestamp!: number;
  @ApiProperty() connections!: number;
  @ApiProperty() heapUsedMB!: number;
  @ApiProperty() rssMB!: number;
  @ApiProperty() preloadMemoryMB!: number;
  @ApiProperty() ffmpegProcesses!: number;
}

export class RealtimeMetricsResponse {
  @ApiProperty({ type: [MetricsPointDto] }) points!: MetricsPointDto[];
}
