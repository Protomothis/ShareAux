import type { RoomPlayback } from '../entities/room-playback.entity.js';
import type { RoomQueue } from '../entities/room-queue.entity.js';
import type { Track } from '../entities/track.entity.js';
import type {
  WsAutoDjStatusPayload,
  WsChatHistoryPayload,
  WsListenerCountPayload,
  WsLyricsResultPayload,
  WsLyricsUpdatedPayload,
  WsMetadataUpdatedPayload,
  WsNicknamePayload,
  WsTrackNamePayload,
  WsTrackVotePayload,
  WsUserTrackAddedPayload,
  WsVoteUpdatedPayload,
} from '../common/dto/ws-payloads.schema.js';
import type { AutoDjStatus, LyricsStatus, StreamState } from './index.js';
import { WsEvent } from './ws-event.enum.js';

/** getStatus() 반환 타입 — PlaybackUpdated payload */
export interface PlaybackUpdatedData extends RoomPlayback {
  track: Track | null;
  elapsedMs: number;
  streamCodec: string;
  streamBitrate: number;
  streamState: StreamState;
  transStatus: string | null;
}

/** 각 WsEvent에 대응하는 payload 타입 */
export interface WsPayloadMap {
  // 방 상태
  [WsEvent.RoomClosed]: undefined;
  [WsEvent.RoomUpdated]: undefined;

  // 멤버
  [WsEvent.UserJoined]: WsNicknamePayload;
  [WsEvent.UserLeft]: WsNicknamePayload | undefined;
  [WsEvent.UserKicked]: undefined;
  [WsEvent.HostChanged]: WsNicknamePayload;
  [WsEvent.PermissionChanged]: undefined;
  [WsEvent.ListenerCount]: WsListenerCountPayload;

  // 재생
  [WsEvent.PlaybackUpdated]: PlaybackUpdatedData | { streamState: StreamState } | null;
  [WsEvent.MetadataUpdated]: WsMetadataUpdatedPayload;
  [WsEvent.TrackSkipped]: WsNicknamePayload;
  [WsEvent.TrackUnavailable]: WsTrackNamePayload;
  [WsEvent.TrackPrevious]: undefined;
  [WsEvent.TrackAdded]: WsTrackNamePayload;
  [WsEvent.UserTrackAdded]: WsUserTrackAddedPayload;

  // 큐
  [WsEvent.QueueUpdated]: { queue: RoomQueue[] };

  // 투표
  [WsEvent.VoteSkipRequested]: undefined;
  [WsEvent.VoteSkipPassed]: undefined;
  [WsEvent.VoteUpdated]: WsVoteUpdatedPayload;
  [WsEvent.TrackVote]: WsTrackVotePayload;

  // 가사
  [WsEvent.LyricsResult]: WsLyricsResultPayload;
  [WsEvent.LyricsUpdated]: WsLyricsUpdatedPayload;

  // AutoDJ
  [WsEvent.AutoDjStatus]: WsAutoDjStatusPayload;
  [WsEvent.AutoDjEnabled]: undefined;
  [WsEvent.AutoDjDisabled]: undefined;

  // 기타
  [WsEvent.SystemMessage]: undefined;
  [WsEvent.EnqueueCountsReset]: undefined;
  [WsEvent.ChatHistory]: WsChatHistoryPayload;
  [WsEvent.ChatMuted]: undefined;
  [WsEvent.ChatCleared]: undefined;
  [WsEvent.DuplicateSession]: undefined;
  [WsEvent.JoinedOtherRoom]: undefined;
}
