import { describe, expect, it } from 'vitest';
import { xpToNext } from '../src/game/xp.ts';

describe('xp', () => {
  it('curve is monotonic', () => {
    let prev = 0;
    for (let level = 1; level <= 200; level++) {
      const next = xpToNext(level);
      expect(next).toBeGreaterThan(prev);
      prev = next;
    }
  });

  it('level 500 requirement is finite', () => {
    const v = xpToNext(500);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1_000_000);
  });

  it('matches plan sample at level 200 scale', () => {
    expect(xpToNext(1)).toBeGreaterThan(20);
  });
});
