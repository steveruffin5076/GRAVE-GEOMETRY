import { describe, expect, it } from 'vitest';
import {
  createRng,
  nextFloat,
  nextInt,
  pick,
  shuffleInPlace,
  snapshotSequence,
  weightedPick,
} from '../src/core/math/rng.ts';

describe('rng', () => {
  it('same seed produces the same float sequence', () => {
    const a = snapshotSequence(42, 20);
    const b = snapshotSequence(42, 20);
    expect(a).toEqual(b);
  });

  it('different seeds diverge', () => {
    const a = snapshotSequence(1, 10);
    const b = snapshotSequence(2, 10);
    expect(a).not.toEqual(b);
  });

  it('nextInt stays within inclusive bounds', () => {
    const rng = createRng(99);
    for (let i = 0; i < 500; i++) {
      const n = nextInt(rng, 3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
    }
  });

  it('pick selects only from the provided items', () => {
    const rng = createRng(7);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(pick(rng, items));
    }
  });

  it('weightedPick favors heavier weights', () => {
    const rng = createRng(1234);
    const items = ['light', 'heavy'] as const;
    let heavy = 0;
    for (let i = 0; i < 1000; i++) {
      if (weightedPick(rng, items, (item) => (item === 'heavy' ? 9 : 1)) === 'heavy') {
        heavy++;
      }
    }
    expect(heavy).toBeGreaterThan(800);
  });

  it('shuffleInPlace is deterministic for a seed', () => {
    const mk = (seed: number) => {
      const rng = createRng(seed);
      const arr = [1, 2, 3, 4, 5, 6, 7, 8];
      return shuffleInPlace(rng, arr.slice());
    };
    expect(mk(555)).toEqual(mk(555));
    expect(mk(555)).not.toEqual(mk(556));
  });

  it('does not use Math.random in this module', () => {
    const src = snapshotSequence.toString();
    expect(src.includes('Math.random')).toBe(false);
  });

  it('stream advances with nextFloat', () => {
    const rng = createRng(1);
    const first = nextFloat(rng);
    const second = nextFloat(rng);
    expect(first).not.toBe(second);
  });
});
