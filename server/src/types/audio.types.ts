import type { ChildProcess } from 'child_process';

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

export interface RoomAudio {
  ffmpeg: ChildProcess | null;
  listeners: Map<(chunk: Buffer) => void, ListenerState>;
  playing: boolean;
  initSegment: Buffer | null;
  recentChunks: Buffer[];
  codec?: string;
  bitrate?: number;
}
