import { LyricsType } from './lyrics-type.enum.js';

export enum LyricsStatus {
  Searching = 'searching',
  Found = 'found',
  NotFound = 'not_found',
}

export interface LyricsResult {
  syncedLyrics?: string;
  lyricsType?: LyricsType;
}
