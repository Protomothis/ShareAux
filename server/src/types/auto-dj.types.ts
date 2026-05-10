export enum AutoDjMode {
  Related = 'related',
  Radio = 'radio',
  History = 'history',
  Popular = 'popular',
  Mixed = 'mixed',
  Favorites = 'favorites',
  AI = 'ai',
}

export type AutoDjStatus = 'idle' | 'thinking' | 'adding' | 'disabled';

export interface AutoDjTags {
  mood: string[];
  genre: string[];
  era: string[];
  country: string[];
}
