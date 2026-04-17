import { ApiProperty } from '@nestjs/swagger';

import { RoomPlayback } from '../../entities/room-playback.entity.js';
import type { StreamState } from '../../types/index.js';

export class PlaybackStatus extends RoomPlayback {
  @ApiProperty({ description: '경과 시간 (ms)' })
  elapsedMs!: number;

  @ApiProperty({ description: '스트림 코덱', example: 'aac' })
  streamCodec!: string;

  @ApiProperty({ description: '스트림 비트레이트 (kbps)', example: 160 })
  streamBitrate!: number;

  @ApiProperty({ description: '스트림 상태', enum: ['idle', 'preparing', 'skipping', 'streaming'] })
  streamState!: StreamState;
}
