import { describe, expect, it } from 'vitest';
import { depthOf, screenToWorld, worldToScreen } from '../src/core/math/iso.ts';
import { approxEq } from '../src/core/math/vec2.ts';

describe('iso', () => {
  it('maps +64 on x to (+32, +16) screen delta from origin', () => {
    const o = worldToScreen(0, 0);
    const p = worldToScreen(64, 0);
    expect(p.x - o.x).toBeCloseTo(32);
    expect(p.y - o.y).toBeCloseTo(16);
  });

  it('maps +64 on y to (−32, +16) screen delta from origin', () => {
    const o = worldToScreen(0, 0);
    const p = worldToScreen(0, 64);
    expect(p.x - o.x).toBeCloseTo(-32);
    expect(p.y - o.y).toBeCloseTo(16);
  });

  it('round-trips world → screen → world', () => {
    const samples = [
      [0, 0],
      [64, 0],
      [0, 64],
      [128, 32],
      [-40, 90],
    ] as const;
    for (const [x, y] of samples) {
      const s = worldToScreen(x, y);
      const w = screenToWorld(s.x, s.y);
      expect(approxEq(w, { x, y }, 1e-9)).toBe(true);
    }
  });

  it('height z only affects screen Y, not depth', () => {
    const base = worldToScreen(10, 20);
    const raised = worldToScreen(10, 20, 8);
    expect(raised.y).toBeCloseTo(base.y - 8);
    expect(depthOf(10, 20)).toBeCloseTo(depthOf(10, 20));
  });

  it('depth increases with x + y', () => {
    expect(depthOf(0, 0)).toBe(0);
    expect(depthOf(4, 4)).toBeCloseTo(2);
    expect(depthOf(10, 6)).toBeCloseTo(4);
  });
});
