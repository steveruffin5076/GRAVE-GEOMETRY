import { describe, expect, it } from 'vitest';
import { worldToScreen } from '../src/core/math/iso.ts';
import { aimAtGridUnderDrawPoint } from '../src/core/math/aimGrid.ts';

describe('aimGrid', () => {
  it('aims at grid target under iso draw point', () => {
    const zx = 200;
    const zy = 200;
    const draw = worldToScreen(zx, zy);
    const aim = aimAtGridUnderDrawPoint(draw.x, draw.y, 0, 0, { x: 1, y: 0 });
    expect(aim.x).toBeCloseTo(Math.SQRT1_2, 2);
    expect(aim.y).toBeCloseTo(Math.SQRT1_2, 2);
  });
});
