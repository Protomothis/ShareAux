/** WebSocket system event names — used in broadcastSystem/sendToUser */
export enum WsEvent {
  // 방 상태
  RoomClosed = 'roomClosed',
  RoomUpdated = 'roomUpdated',

  // 멤버
  UserJoined = 'userJoined',
  UserLeft = 'userLeft',
  UserKicked = 'userKicked',
  HostChanged = 'hostChanged',
  PermissionChanged = 'permissionChanged',
  ListenerCount = 'listenerCount',

  // 재생
  PlaybackUpdated = 'playbackUpdated',
  MetadataUpdated = 'metadataUpdated',
  TrackSkipped = 'trackSkipped',
  TrackPrevious = 'trackPrevious',
  TrackAdded = 'trackAdded',

  // 큐
  QueueUpdated = 'queueUpdated',

  // 투표
  VoteSkipRequested = 'voteSkipRequested',
  VoteSkipPassed = 'voteSkipPassed',
  VoteUpdated = 'voteUpdated',
  TrackVote = 'trackVote',

  // 가사
  LyricsResult = 'lyricsResult',
  LyricsUpdated = 'lyricsUpdated',

  // AutoDJ
  AutoDjStatus = 'autoDjStatus',
  AutoDjEnabled = 'autoDjEnabled',
  AutoDjDisabled = 'autoDjDisabled',

  // 기타
  SystemMessage = 'systemMessage',
  EnqueueCountsReset = 'enqueueCountsReset',
  ChatHistory = 'chatHistory',
  ChatMuted = 'chatMuted',
}
