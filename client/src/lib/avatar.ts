import { thumbs } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';

const cache = new Map<string, string>();

export function getAvatar(seed: string) {
  const key = seed;
  if (cache.has(key)) return cache.get(key)!;
  const svg = createAvatar(thumbs, {
    seed,
    backgroundColor: [
      'ff4081',
      'e91e63',
      '9c27b0',
      '673ab7',
      '3f51b5',
      '00bcd4',
      '009688',
      '4caf50',
      'ff9800',
      'f44336',
      '2196f3',
      '795548',
    ],
    backgroundType: ['gradientLinear'],
    shapeColor: [
      'ff4081',
      'e91e63',
      '9c27b0',
      '673ab7',
      '3f51b5',
      '00bcd4',
      '4caf50',
      'ff9800',
      'f44336',
      '2196f3',
      'ffeb3b',
      '795548',
    ],
  }).toString();
  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  cache.set(key, uri);
  return uri;
}
