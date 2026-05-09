import type { ChildProcess } from 'child_process';
import type { Response } from 'express';

export type StreamState = 'idle' | 'preparing' | 'skipping' | 'streaming';

export interface StreamInfo {
  codec?: string;
  bitrate?: number;
}

export interface ParsedInitSegment {
  segment: Buffer;
  rest: Buffer;
}

export interface ListenerState {
  cb: (chunk: Buffer) => void;
  synced: boolean;
}

export interface HttpStreamListener {
  res: Response;
}

export interface RoomAudio {
  ffmpeg: ChildProcess | null;
  listeners: Map<(chunk: Buffer) => void, ListenerState>;
  httpListeners: Set<HttpStreamListener>;
  playing: boolean;
  initSegment: Buffer | null;
  recentChunks: Buffer[];
  codec?: string;
  bitrate?: number;
  /** 현재 재생 중인 소스 URL */
  sourceUrl?: string;
  /** 현재 곡 재생 시작 시각 */
  startedAt?: number;
}
