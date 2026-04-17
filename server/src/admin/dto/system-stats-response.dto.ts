import { ApiProperty } from '@nestjs/swagger';

export class SystemStatsResponse {
  @ApiProperty({ description: 'Active ffmpeg processes' })
  ffmpegProcesses!: number;

  @ApiProperty({ description: 'Preload buffer memory (MB)' })
  preloadMemoryMB!: number;

  @ApiProperty({ description: 'V8 heap used (MB)' })
  heapUsedMB!: number;

  @ApiProperty({ description: 'V8 heap total (MB)' })
  heapTotalMB!: number;

  @ApiProperty({ description: 'Resident set size (MB)' })
  rssMB!: number;

  @ApiProperty({ description: 'Server uptime (seconds)' })
  uptimeSec!: number;
}
