export enum LyricsStatus {
  Searching = 'searching',
  Found = 'found',
  NotFound = 'notFound',
}

export enum LyricsType {
  Plain = 'plain',
  Synced = 'synced',
}

export interface LyricsResult {
  syncedLyrics?: string;
  lyricsType?: LyricsType;
  lang?: string | null;
}
