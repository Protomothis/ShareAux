import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { LyricLine } from '@/types';

import { CONTAINER_H, getGroupHeight, useLyricsScroll } from './useLyricsScroll';

// ─── getGroupHeight 단위 테스트 ──────────────────────────

describe('getGroupHeight', () => {
  it('기본 높이 (번역/루비 없음)', () => {
    expect(getGroupHeight(false, false, false)).toBe(22);
  });

  it('번역 있으면 MAIN_H 추가', () => {
    expect(getGroupHeight(false, true, false)).toBe(22 + 26);
  });

  it('루비 라인이면 16 추가', () => {
    expect(getGroupHeight(true, false, true)).toBe(22 + 16);
  });

  it('번역 + 루비 모두', () => {
    expect(getGroupHeight(true, true, true)).toBe(22 + 26 + 16);
  });

  it('hasRuby=true지만 isRubyLine=false면 루비 높이 미추가', () => {
    expect(getGroupHeight(true, false, false)).toBe(22);
  });
});

// ─── useLyricsScroll 훅 테스트 ───────────────────────────

const makeLines = (times: number[]): LyricLine[] => times.map((time) => ({ time, text: `line-${time}` }));

describe('useLyricsScroll', () => {
  const defaultParams = {
    lines: makeLines([0, 5, 10, 20]),
    elapsed: 0,
    trackId: 'track-1',
    hasRuby: false,
    hasTranslation: false,
    rubyTexts: ['', '', '', ''],
  };

  it('elapsed=0일 때 idx=0 (첫 라인 time이 0)', () => {
    const { result } = renderHook(() => useLyricsScroll(defaultParams));
    expect(result.current.idx).toBe(0);
  });

  it('elapsed에 따라 올바른 idx 반환', () => {
    const { result } = renderHook(() => useLyricsScroll({ ...defaultParams, elapsed: 7 }));
    expect(result.current.idx).toBe(1); // time=5가 마지막 <= 7
  });

  it('elapsed가 마지막 라인 이후면 마지막 인덱스', () => {
    const { result } = renderHook(() => useLyricsScroll({ ...defaultParams, elapsed: 100 }));
    expect(result.current.idx).toBe(3);
  });

  it('빈 lines일 때 idx=-1', () => {
    const { result } = renderHook(() => useLyricsScroll({ ...defaultParams, lines: [], rubyTexts: [] }));
    expect(result.current.idx).toBe(-1);
  });

  it('빈 lines일 때 targetY=0', () => {
    const { result } = renderHook(() => useLyricsScroll({ ...defaultParams, lines: [], rubyTexts: [] }));
    expect(result.current.targetY).toBe(0);
  });

  it('targetY 계산: 중앙 정렬', () => {
    // idx=0, groupOffset[0]=0, currentGroupH=22
    const { result } = renderHook(() => useLyricsScroll({ ...defaultParams, elapsed: 0 }));
    const expectedY = -(0) + (CONTAINER_H - 22) / 2;
    expect(result.current.targetY).toBe(expectedY);
  });

  it('targetY 계산: idx=2일 때 누적 높이 반영', () => {
    // offsets: [0, 22, 44, 66], idx=2 → groupOffset[2]=44
    const { result } = renderHook(() => useLyricsScroll({ ...defaultParams, elapsed: 12 }));
    const expectedY = -44 + (CONTAINER_H - 22) / 2;
    expect(result.current.targetY).toBe(expectedY);
  });

  it('트랙 전환 시 offset과 showSync 리셋', () => {
    const { result, rerender } = renderHook((props) => useLyricsScroll(props), {
      initialProps: defaultParams,
    });

    // offset 변경
    act(() => {
      result.current.setOffset(() => 5);
    });
    expect(result.current.offset).toBe(5);

    // 트랙 변경
    rerender({ ...defaultParams, trackId: 'track-2' });
    expect(result.current.offset).toBe(0);
    expect(result.current.showSync).toBe(false);
  });

  it('elapsed가 첫 라인 time 이전이면 idx=-1', () => {
    const lines = makeLines([5, 10, 15]);
    const { result } = renderHook(() =>
      useLyricsScroll({ ...defaultParams, lines, elapsed: 3, rubyTexts: ['', '', ''] }),
    );
    expect(result.current.idx).toBe(-1);
  });
});
