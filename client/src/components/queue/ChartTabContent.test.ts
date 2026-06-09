import { describe, expect, it } from 'vitest';

import type { ChartTrack } from '@/api/model';

import { chartTrackToSearchItem } from './ChartTabContent';

describe('chartTrackToSearchItem', () => {
  const mockChartTrack: ChartTrack = {
    id: '1',
    sourceId: 'abc123',
    title: 'Test Song',
    artist: 'Test Artist',
    thumbnail: 'https://img.youtube.com/vi/abc123/default.jpg',
    playlistId: 'PLxxx',
    genre: 'K-Pop',
    rank: 1,
    fetchedAt: '2026-01-01T00:00:00.000Z',
  };

  it('sourceId를 올바르게 매핑', () => {
    const result = chartTrackToSearchItem(mockChartTrack);
    expect(result.sourceId).toBe('abc123');
  });

  it('title → name으로 변환', () => {
    const result = chartTrackToSearchItem(mockChartTrack);
    expect(result.name).toBe('Test Song');
  });

  it('artist 유지', () => {
    const result = chartTrackToSearchItem(mockChartTrack);
    expect(result.artist).toBe('Test Artist');
  });

  it('thumbnail 유지', () => {
    const result = chartTrackToSearchItem(mockChartTrack);
    expect(result.thumbnail).toBe('https://img.youtube.com/vi/abc123/default.jpg');
  });

  it('durationMs가 0으로 설정', () => {
    const result = chartTrackToSearchItem(mockChartTrack);
    expect(result.durationMs).toBe(0);
  });

  it('provider가 yt', () => {
    const result = chartTrackToSearchItem(mockChartTrack);
    expect(result.provider).toBe('yt');
  });
});
