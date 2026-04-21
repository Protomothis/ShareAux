'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import {
  favoritesControllerAdd,
  favoritesControllerGetIds,
  favoritesControllerRemove,
  getFavoritesControllerListQueryKey,
} from '@/api/favorites/favorites';
import type { AddFavoriteBodyProvider } from '@/api/model';
import { TrackProvider } from '@/api/model';

/** toggle()에 전달할 수 있는 최소 트랙 정보 */
export interface FavoriteTarget {
  sourceId: string;
  provider: AddFavoriteBodyProvider | TrackProvider | string;
  name: string;
  artist?: string | null;
  thumbnail?: string | null;
  durationMs: number;
}

export function useFavorites(enabled: boolean) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    favoritesControllerGetIds()
      .then((r) => setFavoriteIds(new Set(r.sourceIds)))
      .catch(() => {});
  }, [enabled]);

  const toggle = useCallback(
    async (track: FavoriteTarget) => {
      const id = track.sourceId;
      const was = favoriteIds.has(id);
      // optimistic
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (was) next.delete(id);
        else next.add(id);
        return next;
      });
      setLoadingIds((prev) => new Set(prev).add(id));
      try {
        if (was) {
          await favoritesControllerRemove(id);
        } else {
          await favoritesControllerAdd({
            provider: TrackProvider.yt,
            sourceId: track.sourceId,
            name: track.name,
            artist: track.artist ?? undefined,
            thumbnail: track.thumbnail ?? undefined,
            durationMs: track.durationMs,
          });
        }
        void qc.invalidateQueries({ queryKey: getFavoritesControllerListQueryKey() });
      } catch {
        // rollback
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (was) next.add(id);
          else next.delete(id);
          return next;
        });
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [favoriteIds],
  );

  return { favoriteIds, loadingIds, toggle };
}
