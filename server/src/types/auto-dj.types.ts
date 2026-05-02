export enum AutoDjMode {
  Related = 'related',
  Radio = 'radio',
  History = 'history',
  Popular = 'popular',
  Mixed = 'mixed',
  Favorites = 'favorites',
}

export type AutoDjStatus = 'idle' | 'thinking' | 'adding' | 'disabled';
