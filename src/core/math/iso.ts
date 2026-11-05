import type { Vec2 } from './vec2.ts';
import { vec2 } from './vec2.ts';

/** Grid-space world position → screen (simulation uses plain XY; iso is render-only). */
export function worldToScreen(x: number, y: number, z = 0): Vec2 {
  return vec2((x - y) * 0.5, (x + y) * 0.25 - z);
}

export function screenToWorld(sx: number, sy: number): Vec2 {
  return vec2(sx + 2 * sy, -sx + 2 * sy);
}

export function depthOf(x: number, y: number): number {
  return (x + y) * 0.25;
}

export function worldToScreenVec(v: Vec2, z = 0): Vec2 {
  return worldToScreen(v.x, v.y, z);
}

export function screenToWorldVec(s: Vec2): Vec2 {
  return screenToWorld(s.x, s.y);
}
