import { useCallback, useEffect, useRef, useState } from 'react';

import type { PlaylistResult, Track } from '@/api/model';
import { searchControllerSearch, searchControllerSuggest } from '@/api/search/search';

export function useSearch(isOpen: boolean) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistResult[]>([]);
  const [continuation, setContinuation] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const suggestTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchCache = useRef(
    new Map<string, { tracks: Track[]; playlists: PlaylistResult[]; continuation?: string }>(),
  );

  // 모달 열릴 때 리셋
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => {
      setQuery('');
      setDebouncedQuery('');
      setResults([]);
      setPlaylists([]);
      setContinuation(undefined);
      setSuggestions([]);
      setShowSuggestions(false);
    }, 0);
    return () => clearTimeout(id);
  }, [isOpen]);

  // 자동완성 debounce
  useEffect(() => {
    if (!query.trim()) {
      const id = setTimeout(() => {
        setDebouncedQuery('');
        setResults([]);
        setPlaylists([]);
        setContinuation(undefined);
        setSuggestions([]);
        setShowSuggestions(false);
      }, 0);
      return () => clearTimeout(id);
    }
    clearTimeout(suggestTimer.current);
    if (query.trim() === debouncedQuery) return;
    suggestTimer.current = setTimeout(() => {
      searchControllerSuggest({ q: query.trim() })
        .then((r) => {
          setSuggestions(r.suggestions);
          setShowSuggestions(true);
          setHighlightIdx(-1);
        })
        .catch(() => {});
    }, 200);
    return () => clearTimeout(suggestTimer.current);
  }, [query, debouncedQuery]);

  // 검색 실행
  useEffect(() => {
    if (!debouncedQuery) return;
    const cached = searchCache.current.get(debouncedQuery);
    if (cached) {
      setResults(cached.tracks);
      setPlaylists(cached.playlists);
      setContinuation(cached.continuation);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await searchControllerSearch({ q: debouncedQuery });
        if (!cancelled) {
          searchCache.current.set(debouncedQuery, data);
          setResults(data.tracks);
          setPlaylists(data.playlists ?? []);
          setContinuation(data.continuation);
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const loadMore = useCallback(async () => {
    if (!continuation || loadingMore || !debouncedQuery) return;
    setLoadingMore(true);
    try {
      const data = await searchControllerSearch({ q: debouncedQuery, continuation });
      setResults((prev) => {
        const ids = new Set(prev.map((t) => t.id));
        return [...prev, ...data.tracks.filter((t) => !ids.has(t.id))];
      });
      setContinuation(data.continuation);
    } catch {
      /* ignore */
    }
    setLoadingMore(false);
  }, [continuation, loadingMore, debouncedQuery]);

  const executeSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    clearTimeout(suggestTimer.current);
    setDebouncedQuery(trimmed);
    setShowSuggestions(false);
    setHighlightIdx(-1);
  }, []);

  const pickSuggestion = useCallback(
    (s: string) => {
      setQuery(s);
      executeSearch(s);
    },
    [executeSearch],
  );

  return {
    query,
    setQuery,
    debouncedQuery,
    results,
    playlists,
    loading,
    loadingMore,
    loadMore,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    highlightIdx,
    setHighlightIdx,
    executeSearch,
    pickSuggestion,
  };
}
