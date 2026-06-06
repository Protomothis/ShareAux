import { ApiProperty } from '@nestjs/swagger';

import { SystemChatEvent } from '../../rooms/dto/system-chat-message.dto.js';
import type { AutoDjStatus } from '../../types/index.js';
import {
  AuthProvider,
  AutoDjMode,
  Language,
  LyricsStatus,
  LyricsTransStatus,
  LyricsType,
  MetaStatus,
  OptionKey,
  PushEvent,
  ReportStatus,
  StreamState,
  TranslationLang,
  WsEvent,
} from '../../types/index.js';

/** Swagger에 공유 enum을 노출하기 위한 스키마 */
export class SharedEnums {
  @ApiProperty({ enum: WsEvent, enumName: 'WsEvent' })
  wsEvent!: WsEvent;

  @ApiProperty({ enum: ['idle', 'thinking', 'adding'], enumName: 'AutoDjStatus' })
  autoDjStatus!: AutoDjStatus;

  @ApiProperty({ enum: AutoDjMode, enumName: 'AutoDjMode' })
  autoDjMode!: AutoDjMode;

  @ApiProperty({ enum: Language, enumName: 'Language' })
  language!: Language;

  @ApiProperty({ enum: AuthProvider, enumName: 'AuthProvider' })
  authProvider!: AuthProvider;

  @ApiProperty({ enum: SystemChatEvent, enumName: 'SystemChatEvent' })
  systemChatEvent!: SystemChatEvent;

  @ApiProperty({ enum: OptionKey, enumName: 'OptionKey' })
  optionKey!: OptionKey;

  @ApiProperty({ enum: MetaStatus, enumName: 'MetaStatus' })
  metaStatus!: MetaStatus;

  @ApiProperty({ enum: PushEvent, enumName: 'PushEvent' })
  pushEvent!: PushEvent;

  @ApiProperty({ enum: TranslationLang, enumName: 'TranslationLang' })
  translationLang!: TranslationLang;

  @ApiProperty({ enum: LyricsStatus, enumName: 'LyricsStatus' })
  lyricsStatus!: LyricsStatus;

  @ApiProperty({ enum: LyricsType, enumName: 'LyricsType' })
  lyricsType!: LyricsType;

  @ApiProperty({ enum: StreamState, enumName: 'StreamState' })
  streamState!: StreamState;

  @ApiProperty({ enum: LyricsTransStatus, enumName: 'LyricsTransStatus' })
  lyricsTransStatus!: LyricsTransStatus;

  @ApiProperty({ enum: ReportStatus, enumName: 'ReportStatus' })
  reportStatus!: ReportStatus;
}
