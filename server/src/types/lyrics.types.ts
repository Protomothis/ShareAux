export enum LyricsStatus {
  Searching = 'searching',
  Found = 'found',
  NotFound = 'not_found',
}

export interface LyricsResult {
  syncedLyrics?: string;
  enhanced?: boolean;
}
