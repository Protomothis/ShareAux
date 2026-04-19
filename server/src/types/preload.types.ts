export const enum PreloadState {
  Idle = 'idle',
  Downloading = 'downloading',
  Preloaded = 'preloaded',
  Failed = 'failed',
}

export const enum PlayFailReason {
  UrlUnavailable = 'url_unavailable',
  FfmpegCrash = 'ffmpeg_crash',
  Timeout = 'timeout',
}

export interface PreloadEntry {
  state: PreloadState;
  buffer: Buffer | null;
  size: number;
  sourceId: string;
  refCount: number;
  at: number;
}
