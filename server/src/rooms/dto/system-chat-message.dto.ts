import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 채팅에 표시되는 시스템 이벤트 */
export enum SystemChatEvent {
  UserJoined = 'userJoined',
  UserLeft = 'userLeft',
  UserKicked = 'userKicked',
  HostChanged = 'hostChanged',
  TrackSkipped = 'trackSkipped',
  TrackPrevious = 'trackPrevious',
  TrackAdded = 'trackAdded',
  UserTrackAdded = 'userTrackAdded',
  TrackUnavailable = 'trackUnavailable',
  VoteSkipPassed = 'voteSkipPassed',
  RoomClosed = 'roomClosed',
  AutoDjEnabled = 'autoDjEnabled',
  AutoDjDisabled = 'autoDjDisabled',
  EnqueueCountsReset = 'enqueueCountsReset',
}

/** 시스템 채팅 메시지 페이로드 */
export class SystemChatMessage {
  @ApiProperty({ enum: SystemChatEvent, enumName: 'SystemChatEvent' })
  event!: SystemChatEvent;

  @ApiPropertyOptional({ description: '이벤트 관련 닉네임 (입장/퇴장/스킵 등)' })
  nickname?: string;

  @ApiPropertyOptional({ description: '이벤트 관련 트랙명 (AutoDJ 추가/재생 불가 등)' })
  trackName?: string;

  @ApiPropertyOptional({ description: '추가된 곡 수' })
  count?: number;
}
