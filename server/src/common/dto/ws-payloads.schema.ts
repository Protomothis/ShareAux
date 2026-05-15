import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { AutoDjStatus } from '../../types/index.js';
import { LyricsStatus, LyricsType } from '../../types/index.js';
import { UserRole } from '../../types/user-role.enum.js';

// ─── 개별 Payload DTO ───

export class WsPlaybackUpdatedPayload {
  @ApiPropertyOptional({ description: '현재 트랙 ID' })
  trackId?: string;

  @ApiPropertyOptional({ description: '경과 시간 (ms)' })
  elapsedMs?: number;

  @ApiPropertyOptional({ description: '재생 중 여부' })
  isPlaying?: boolean;

  @ApiPropertyOptional({ description: '스트림 상태', enum: ['idle', 'preparing', 'skipping', 'streaming'] })
  streamState?: string;
}

export class WsQueueUpdatedPayload {
  @ApiProperty({ description: '큐 목록 (전체)' })
  queue!: unknown[];
}

export class WsVoteUpdatedPayload {
  @ApiProperty() currentVotes!: number;
  @ApiProperty() required!: number;
}

export class WsTrackVotePayload {
  @ApiProperty() trackId!: string;
  @ApiProperty() likes!: number;
  @ApiProperty() dislikes!: number;
}

export class WsListenerCountPayload {
  @ApiProperty() count!: number;
}

export class WsLyricsResultPayload {
  @ApiProperty({ enum: LyricsStatus, enumName: 'LyricsStatus' })
  status!: LyricsStatus;

  @ApiPropertyOptional({ enum: LyricsType, enumName: 'LyricsType', nullable: true })
  lyricsType?: LyricsType | null;
}

export class WsLyricsUpdatedPayload {
  @ApiProperty() trackId!: string;
}

export class WsMetadataUpdatedPayload {
  @ApiPropertyOptional({ type: String }) title?: string;
  @ApiPropertyOptional({ type: String, nullable: true }) artist?: string | null;
}

export class WsAutoDjStatusPayload {
  @ApiProperty({ enum: ['idle', 'thinking', 'adding', 'disabled'], enumName: 'AutoDjStatus' })
  status!: AutoDjStatus;

  @ApiPropertyOptional() reason?: string;
}

export class WsNicknamePayload {
  @ApiProperty() nickname!: string;
}

export class WsTrackNamePayload {
  @ApiProperty() trackName!: string;
}

export class WsUserTrackAddedPayload {
  @ApiProperty() nickname!: string;
  @ApiProperty() trackName!: string;
  @ApiPropertyOptional() count?: number;
}

export class WsChatMessageItem {
  @ApiProperty() userId!: string;
  @ApiProperty() nickname!: string;
  @ApiProperty() message!: string;
  @ApiPropertyOptional({ enum: UserRole, enumName: 'UserRole' }) role?: UserRole;
  @ApiProperty() timestamp!: string;
}

export class WsChatHistoryPayload {
  @ApiProperty({ type: [WsChatMessageItem] })
  messages!: WsChatMessageItem[];
}

// ─── Swagger 노출용 스키마 ───

@ApiExtraModels(
  WsPlaybackUpdatedPayload,
  WsQueueUpdatedPayload,
  WsVoteUpdatedPayload,
  WsTrackVotePayload,
  WsListenerCountPayload,
  WsLyricsResultPayload,
  WsLyricsUpdatedPayload,
  WsMetadataUpdatedPayload,
  WsAutoDjStatusPayload,
  WsNicknamePayload,
  WsTrackNamePayload,
  WsUserTrackAddedPayload,
  WsChatHistoryPayload,
  WsChatMessageItem,
)
export class WsPayloadsSchema {}
