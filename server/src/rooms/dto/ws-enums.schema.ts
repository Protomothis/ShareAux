import { ApiProperty } from '@nestjs/swagger';

import type { AutoDjStatus } from '../../types/index.js';
import { WsEvent } from '../../types/index.js';

/** Swagger에 WS 관련 enum을 노출하기 위한 스키마 DTO */
export class WsEnumsSchema {
  @ApiProperty({ enum: WsEvent, description: 'WebSocket system event name' })
  wsEvent!: WsEvent;

  @ApiProperty({ enum: ['idle', 'thinking', 'adding'], description: 'AutoDJ 상태' })
  autoDjStatus!: AutoDjStatus;
}
