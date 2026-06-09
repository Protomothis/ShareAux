import { useEffect, useMemo, useRef, useState } from 'react';

import type { LyricLine } from '@/types';

const LINE_H = 22;
const MAIN_H = 26;
const CONTAINER_H = 100;

function getGroupHeight(hasRuby: boolean, hasTranslation: boolean, isRubyLine: boolean): number {
  let h = LINE_H;
  if (hasTranslation) h += MAIN_H;
  if (hasRuby && isRubyLine) h += 16;
  return h;
}

interface UseLyricsScrollParams {
  lines: LyricLine[];
  elapsed: number;
  trackId?: string;
  hasRuby: boolean;
  hasTranslation: boolean;
  rubyTexts: string[];
}

interface UseLyricsScrollResult {
  idx: number;
  targetY: number;
  offset: number;
  setOffset: (fn: (o: number) => number) => void;
  showSync: boolean;
  setShowSync: (v: boolean) => void;
}

export function useLyricsScroll({
  lines,
  elapsed,
  trackId,
  hasRuby,
  hasTranslation,
  rubyTexts,
}: UseLyricsScrollParams): UseLyricsScrollResult {
  const [offset, setOffset] = useState(0);
  const [showSync, setShowSync] = useState(false);
  const prevTrackIdRef = useRef(trackId);

  useEffect(() => {
    if (trackId !== prevTrackIdRef.current) {
      prevTrackIdRef.current = trackId;
      setOffset(0);
      setShowSync(false);
    }
  }, [trackId]);

  const groupOffsets = useMemo(() => {
    const offsets: number[] = [];
    let y = 0;
    for (let i = 0; i < lines.length; i++) {
      offsets.push(y);
      const isRubyLine = hasRuby && !!(rubyTexts[i] ?? '').trim();
      y += getGroupHeight(hasRuby, hasTranslation, isRubyLine);
    }
    return offsets;
  }, [lines.length, hasRuby, hasTranslation, rubyTexts]);

  const adjusted = elapsed + offset;
  const idx = lines.findLastIndex((l) => l.time <= adjusted);

  const currentGroupH =
    idx >= 0 ? getGroupHeight(hasRuby, hasTranslation, hasRuby && !!(rubyTexts[idx] ?? '').trim()) : LINE_H;
  const targetY = idx >= 0 ? -(groupOffsets[idx] ?? 0) + (CONTAINER_H - currentGroupH) / 2 : 0;

  return { idx, targetY, offset, setOffset, showSync, setShowSync };
}

export { CONTAINER_H, LINE_H, MAIN_H, getGroupHeight };
