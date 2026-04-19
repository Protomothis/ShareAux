'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  favoritesControllerAdd,
  favoritesControllerGetIds,
  favoritesControllerRemove,
} from '@/api/favorites/favorites';
import type { SearchResultItem } from '@/api/model';
import { TrackProvider } from '@/api/model';

export function useFavorites(enabled: boolean) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    favoritesControllerGetIds()
      .then((r) => setFavoriteIds(new Set(r.sourceIds)))
      .catch(() => {});
  }, [enabled]);

  const toggle = useCallback(
    async (track: SearchResultItem) => {
      const id = track.sourceId;
      const was = favoriteIds.has(id);
      // optimistic
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (was) next.delete(id);
        else next.add(id);
        return next;
      });
      try {
        if (was) {
          await favoritesControllerRemove(id);
        } else {
          await favoritesControllerAdd({
            provider: (track.provider as unknown as string) === 'yt' ? TrackProvider.yt : TrackProvider.yt,
            sourceId: track.sourceId,
            name: track.name,
            artist: track.artist ?? undefined,
            thumbnail: track.thumbnail ?? undefined,
            durationMs: track.durationMs,
          });
        }
      } catch {
        // rollback
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (was) next.add(id);
          else next.delete(id);
          return next;
        });
      }
    },
    [favoriteIds],
  );

  return { favoriteIds, toggle };
}
