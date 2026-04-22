import { ApiProperty } from '@nestjs/swagger';

import type { AutoDjStatus } from '../../types/index.js';
import { AuthProvider, Language, WsEvent } from '../../types/index.js';
import { SystemChatEvent } from '../../rooms/dto/system-chat-message.dto.js';

/** Swagger에 공유 enum을 노출하기 위한 스키마 */
export class SharedEnums {
  @ApiProperty({ enum: WsEvent, enumName: 'WsEvent' })
  wsEvent!: WsEvent;

  @ApiProperty({ enum: ['idle', 'thinking', 'adding'], enumName: 'AutoDjStatus' })
  autoDjStatus!: AutoDjStatus;

  @ApiProperty({ enum: Language, enumName: 'Language' })
  language!: Language;

  @ApiProperty({ enum: AuthProvider, enumName: 'AuthProvider' })
  authProvider!: AuthProvider;

  @ApiProperty({ enum: SystemChatEvent, enumName: 'SystemChatEvent' })
  systemChatEvent!: SystemChatEvent;
}
