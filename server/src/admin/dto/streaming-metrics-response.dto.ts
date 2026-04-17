import { ApiProperty } from '@nestjs/swagger';

export class StreamingMetricsResponse {
  @ApiProperty() activeStreams!: number;
  @ApiProperty() totalListeners!: number;
  @ApiProperty() preloadMemoryMB!: number;
  @ApiProperty() preloadedTracks!: number;
}
