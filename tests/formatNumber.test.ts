import { describe, expect, it } from 'vitest';
import { formatCompact } from '../src/core/formatNumber.ts';

describe('formatCompact', () => {
  it('shows plain integers below 10k', () => {
    expect(formatCompact(9999)).toBe('9999');
    expect(formatCompact(0)).toBe('0');
  });

  it('compact-formats at and above 10k', () => {
    expect(formatCompact(10_000)).toBe('10k');
    expect(formatCompact(12_500)).toBe('12.5k');
    expect(formatCompact(1_000_000)).toBe('1M');
  });
});
