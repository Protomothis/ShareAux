'use client';

import { Clock, Loader2, Minus, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { LyricsResponse } from '@/api/model';
import { playerControllerLyrics } from '@/api/player/player';
import type { LyricLine, LyricWord } from '@/types';
import { LyricsStatus } from '@/types';
import { useQuery } from '@tanstack/react-query';

import { Button } from '../ui/button';

interface LyricsProps {
  roomId: string;
  elapsed: number;
  elapsedBase: number;
  syncTime: number;
  lyricsStatus: LyricsStatus;
  trackId?: string;
  lyricsVersion?: number;
  karaoke?: boolean;
}

interface LyricsData {
  synced: string;
  lang: string | null;
  ruby: string | null;
  translated: string | null;
  transStatus: string | null;
}

// ─── Parsing ────────────────────────────────────────────

function parseEnhancedLine(text: string): LyricWord[] | undefined {
  const wordRegex = /<(\d+):(\d+[.\d]*)>\s*([^<]*)/g;
  const words: LyricWord[] = [];
  let m: RegExpExecArray | null;
  while ((m = wordRegex.exec(text))) {
    const t = (+m[1] * 60 + +m[2]) * 1000;
    const w = m[3].trim();
    if (w) words.push({ time: t, text: w });
  }
  return words.length > 0 ? words : undefined;
}

function parseLRC(lrc: string): LyricLine[] {
  return lrc.split('\n').reduce<LyricLine[]>((acc, line) => {
    const m = line.match(/^\[(\d+):(\d+[.\d]*)\]\s*(.*)/);
    if (!m) return acc;
    const time = (+m[1] * 60 + +m[2]) * 1000;
    const raw = m[3];
    const words = parseEnhancedLine(raw);
    const text = words ? words.map((w) => w.text).join(' ') : raw;
    if (text) acc.push({ time, text, words });
    return acc;
  }, []);
}

function parseLRCTexts(lrc: string): string[] {
  return lrc.split('\n').reduce<string[]>((acc, line) => {
    const m = line.match(/^\[(\d+):(\d+[.\d]*)\]\s*(.*)/);
    if (m) acc.push(m[3] ?? '');
    return acc;
  }, []);
}

// ─── KaraokeLine ────────────────────────────────────────

const ACTIVE_COLOR = 'rgba(255,255,255,1)';
const INACTIVE_COLOR = 'rgba(255,255,255,0.25)';
const EDGE_WIDTH = 3;

function KaraokeLine({
  words,
  elapsedBase,
  syncTime,
  nextLineTime,
}: {
  words: LyricWord[];
  elapsedBase: number;
  syncTime: number;
  nextLineTime?: number;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef(0);
  const fullText = useMemo(() => words.map((w) => w.text).join(' '), [words]);
  const lineStart = words[0].time;
  const lastWord = words[words.length - 1];
  const lineEnd = nextLineTime ?? lastWord.time + Math.max(lastWord.text.length * 150, 300);

  useEffect(() => {
    const tick = () => {
      if (!spanRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const now = elapsedBase + (Date.now() - syncTime);
      let p = 0;
      if (now >= lineEnd) {
        p = 100;
      } else if (now > lineStart) {
        let chars = 0;
        for (let i = 0; i < words.length; i++) {
          if (now < words[i].time) break;
          const next = i + 1 < words.length ? words[i + 1].time : lineEnd + 200;
          const wp = Math.min(1, (now - words[i].time) / (next - words[i].time));
          chars = (i > 0 ? chars : 0) + (i > 0 ? 1 : 0) + words[i].text.length * wp;
        }
        p = (chars / fullText.length) * 100;
      }
      const lo = Math.max(0, p - EDGE_WIDTH);
      const hi = Math.min(100, p + EDGE_WIDTH);
      spanRef.current.style.backgroundImage = `linear-gradient(to right, ${ACTIVE_COLOR} ${lo}%, ${INACTIVE_COLOR} ${hi}%)`;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [elapsedBase, syncTime, words, fullText, lineStart, lineEnd]);

  return (
    <span
      ref={spanRef}
      className="bg-clip-text [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]"
      style={{ backgroundImage: `linear-gradient(to right, ${INACTIVE_COLOR} 0%, ${INACTIVE_COLOR} 100%)` }}
    >
      {fullText}
    </span>
  );
}

// ─── Sync Controls ──────────────────────────────────────

function SyncControls({
  offset,
  setOffset,
  showSync,
  setShowSync,
}: {
  offset: number;
  setOffset: (fn: (o: number) => number) => void;
  showSync: boolean;
  setShowSync: (v: boolean) => void;
}) {
  if (showSync) {
    return (
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 'auto', opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex shrink-0 items-center gap-1 overflow-hidden"
      >
        <Button
          variant="ghost-muted"
          size="sm"
          onClick={() => setOffset((o) => o - 500)}
          className="h-8 w-8 rounded-full text-white/50 active:text-white lg:h-6 lg:w-6"
        >
          <Minus size={14} />
        </Button>
        <span className="min-w-[2.5rem] text-center font-mono text-[10px] text-white/50">
          {offset >= 0 ? '+' : ''}
          {(offset / 1000).toFixed(1)}s
        </span>
        <Button
          variant="ghost-muted"
          size="sm"
          onClick={() => setOffset((o) => o + 500)}
          className="h-8 w-8 rounded-full text-white/50 active:text-white lg:h-6 lg:w-6"
        >
          <Plus size={14} />
        </Button>
        <Button
          variant="ghost-muted"
          size="sm"
          onClick={() => setShowSync(false)}
          className="h-8 w-8 rounded-full text-white/30 active:text-white lg:h-6 lg:w-6"
        >
          <X size={12} />
        </Button>
      </motion.div>
    );
  }

  return (
    <Button
      variant="ghost-muted"
      size="sm"
      onClick={() => setShowSync(true)}
      className="h-8 w-8 shrink-0 rounded-full text-white/25 active:text-white lg:h-6 lg:w-6"
    >
      <Clock size={12} />
    </Button>
  );
}

// ─── 거리 기반 스타일 ───────────────────────────────────

/** 현재 그룹(0)으로부터의 거리에 따른 스타일 */
function getDistanceStyle(dist: number): { opacity: number; scale: number } {
  const absDist = Math.abs(dist);
  if (absDist === 0) return { opacity: 1, scale: 1 };
  if (absDist === 1) return { opacity: 0.25, scale: 0.95 };
  if (absDist === 2) return { opacity: 0.15, scale: 0.92 };
  return { opacity: 0.08, scale: 0.9 };
}

// ─── 그룹 높이 계산 ────────────────────────────────────

const LINE_H = 22; // 기본 줄 높이
const MAIN_H = 26; // 메인(번역) 줄 높이

function getGroupHeight(hasRuby: boolean, hasTranslation: boolean, isRubyLine: boolean): number {
  let h = LINE_H; // 원문
  if (hasTranslation) h += MAIN_H; // 번역
  if (hasRuby && isRubyLine) h += 16; // 발음
  return h;
}

// ─── Main Lyrics Component ──────────────────────────────

const CONTAINER_H = 100; // px

export default function Lyrics({
  roomId,
  elapsed,
  elapsedBase,
  syncTime,
  lyricsStatus,
  trackId,
  lyricsVersion = 0,
  karaoke = false,
}: LyricsProps) {
  const [offset, setOffset] = useState(0);
  const [showSync, setShowSync] = useState(false);

  const prevTrackIdRef = useRef(trackId);

  const { data: lyricsData } = useQuery({
    queryKey: ['lyrics', roomId, trackId, lyricsVersion],
    queryFn: async (): Promise<LyricsData | null> => {
      const r: LyricsResponse = await playerControllerLyrics(roomId);
      if (!r.syncedLyrics) return null;
      return {
        synced: r.syncedLyrics,
        lang: r.lang ?? null,
        ruby: r.ruby ?? null,
        translated: r.translated ?? null,
        transStatus: r.transStatus ?? null,
      };
    },
    enabled: !!trackId && lyricsStatus === LyricsStatus.Found,
    staleTime: 30_000,
    retry: 1,
  });

  // trackId 변경 시 offset/sync 리셋
  useEffect(() => {
    if (trackId !== prevTrackIdRef.current) {
      prevTrackIdRef.current = trackId;
      setOffset(0);
      setShowSync(false);
    }
  }, [trackId]);

  const lines = useMemo(() => (lyricsData?.synced ? parseLRC(lyricsData.synced) : []), [lyricsData?.synced]);

  const rubyTexts = useMemo(
    () => (lyricsData?.ruby && lyricsData.lang === 'ja' ? parseLRCTexts(lyricsData.ruby) : []),
    [lyricsData?.ruby, lyricsData?.lang],
  );
  const translatedTexts = useMemo(
    () => (lyricsData?.translated ? parseLRCTexts(lyricsData.translated) : []),
    [lyricsData?.translated],
  );

  const hasTranslation = translatedTexts.length > 0;
  const hasRuby = rubyTexts.length > 0;

  // ─── 각 그룹의 Y 오프셋 사전 계산 ─────────────────

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

  // ─── Empty states ─────────────────────────────────

  const shell = (text: string, cls = 'text-white/15') => (
    <div className="mx-4 mb-3 select-none lg:mb-1">
      <div className="flex items-center justify-center text-center" style={{ height: CONTAINER_H }}>
        <span className={`text-[13px] ${cls}`}>{text}</span>
      </div>
    </div>
  );

  if (lyricsStatus === LyricsStatus.Searching && !lines.length && trackId) {
    return shell('가사 검색 중...', 'text-white/20');
  }
  if (!lines.length) {
    return shell(lyricsStatus === LyricsStatus.NotFound ? '가사 없음' : '♪');
  }

  // ─── Current index ─────────────────────────────────

  const adjusted = elapsed + offset;
  const idx = lines.findLastIndex((l) => l.time <= adjusted);

  // 현재 그룹이 컨테이너 중앙에 오도록 translateY 계산
  const currentGroupH =
    idx >= 0 ? getGroupHeight(hasRuby, hasTranslation, hasRuby && !!(rubyTexts[idx] ?? '').trim()) : LINE_H;
  const targetY = idx >= 0 ? -(groupOffsets[idx] ?? 0) + (CONTAINER_H - currentGroupH) / 2 : 0;

  return (
    <motion.div
      key="lyrics"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="mx-4 mb-3 select-none lg:mb-1"
    >
      <div className="flex items-center gap-2">
        {/* 가사 스크롤 컨테이너 */}
        <div
          className="min-w-0 flex-1 overflow-hidden"
          style={{
            height: CONTAINER_H,
            maskImage: 'linear-gradient(transparent, black 15%, black 85%, transparent)',
            WebkitMaskImage: 'linear-gradient(transparent, black 15%, black 85%, transparent)',
          }}
        >
          <motion.div animate={{ y: targetY }} transition={{ type: 'spring', stiffness: 200, damping: 25 }}>
            {lines.map((line, i) => {
              const dist = idx >= 0 ? i - idx : i;
              const { opacity, scale } = getDistanceStyle(dist);
              const isActive = i === idx;
              const rubyText = hasRuby ? (rubyTexts[i] ?? '').trim() : '';
              const transText = hasTranslation ? (translatedTexts[i] ?? '') : '';
              const nextTime = i + 1 < lines.length ? lines[i + 1].time : undefined;

              return (
                <motion.div
                  key={i}
                  animate={{ opacity, scale }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="text-center"
                >
                  {/* 발음 */}
                  {rubyText && <div className="truncate text-[10px] leading-[16px] text-white/30">{rubyText}</div>}

                  {/* 원문 */}
                  <div
                    className={`truncate leading-[${LINE_H}px] ${
                      hasTranslation
                        ? 'text-xs text-white/60'
                        : isActive
                          ? 'text-sm font-bold text-white'
                          : 'text-xs text-white/50'
                    }`}
                    style={{ lineHeight: `${LINE_H}px` }}
                  >
                    {isActive && karaoke && line.words ? (
                      <KaraokeLine
                        words={line.words}
                        elapsedBase={elapsedBase + offset}
                        syncTime={syncTime}
                        nextLineTime={nextTime}
                      />
                    ) : (
                      line.text
                    )}
                  </div>

                  {/* 번역 (메인) */}
                  {hasTranslation && (
                    <div
                      className={`truncate ${isActive ? 'text-sm font-semibold text-white' : 'text-xs text-white/40'}`}
                      style={{ lineHeight: `${MAIN_H}px` }}
                    >
                      {transText || '\u00A0'}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>

          {/* pending 스피너 */}
          {!hasTranslation && lyricsData?.transStatus === 'pending' && (
            <div className="flex h-4 items-center justify-center">
              <Loader2 size={10} className="animate-spin text-white/30" />
            </div>
          )}
        </div>

        <SyncControls offset={offset} setOffset={setOffset} showSync={showSync} setShowSync={setShowSync} />
      </div>
    </motion.div>
  );
}
