import type { Track } from '@/api/model';
import type { PlaybackStatusStreamState } from '@/api/model';
import type { WsEnumsSchemaAutoDjStatus } from '@/api/model';

/** Track 정보 중 플레이어 UI에 필요한 필드만 추출 */
export type TrackInfo = Pick<
  Track,
  'id' | 'sourceId' | 'provider' | 'name' | 'artist' | 'thumbnail' | 'durationMs' | 'songTitle' | 'songArtist'
>;

export type VisualMode = 'bars' | 'wave' | 'mirror' | 'dots';

/** swagger 기반 StreamState (server PlaybackStatus.streamState) */
export type StreamState = PlaybackStatusStreamState;

/** swagger 기반 AutoDjStatus (server WsEnumsSchema.autoDjStatus) */
export type AutoDjStatus = WsEnumsSchemaAutoDjStatus;

/** swagger 기반 AutoDjMode (server CreateRoomDto.autoDjMode) */
export type { CreateRoomDtoAutoDjMode as AutoDjMode } from '@/api/model';

/** 트랙별 좋아요/싫어요 집계 */
export type TrackVoteMap = Map<string, { likes: number; dislikes: number }>;

/** 큐 아이템 shimmer 색상 */
export type ShimmerVariant = 'accent' | 'white';

export enum LyricsStatus {
  Searching = 'searching',
  Found = 'found',
  NotFound = 'not_found',
}

/** Enhanced LRC word-level 타임스탬프 */
export interface LyricWord {
  time: number;
  text: string;
}

export interface LyricLine {
  time: number;
  text: string;
  words?: LyricWord[];
}
