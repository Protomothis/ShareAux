import { describe, expect, it } from 'vitest';

import { formatDuration } from './format';

describe('formatDuration', () => {
  it('0ms → 0:00', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('59초 → 0:59', () => {
    expect(formatDuration(59_000)).toBe('0:59');
  });

  it('60초 → 1:00', () => {
    expect(formatDuration(60_000)).toBe('1:00');
  });

  it('3599초 → 59:59', () => {
    expect(formatDuration(3_599_000)).toBe('59:59');
  });

  it('3600초 → 60:00', () => {
    expect(formatDuration(3_600_000)).toBe('60:00');
  });

  it('음수 → 0:00 (Math.max(0, ...) 처리)', () => {
    expect(formatDuration(-5000)).toBe('0:00');
  });

  it('소수점 ms → 버림 (floor)', () => {
    expect(formatDuration(61_500)).toBe('1:01');
  });

  it('999ms → 0:00 (1초 미만)', () => {
    expect(formatDuration(999)).toBe('0:00');
  });
});
