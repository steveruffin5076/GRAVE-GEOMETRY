import { TILE_W } from '../config/constants.ts';
import type { Vec2 } from '../core/math/vec2.ts';
import { vec2 } from '../core/math/vec2.ts';
import type { Obstacle } from './map.ts';

function circleVsAabb(
  cx: number,
  cy: number,
  r: number,
  o: Obstacle,
): { hit: boolean; nx: number; ny: number; depth: number } {
  const closestX = Math.max(o.x - o.halfW, Math.min(cx, o.x + o.halfW));
  const closestY = Math.max(o.y - o.halfH, Math.min(cy, o.y + o.halfH));
  const dx = cx - closestX;
  const dy = cy - closestY;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return { hit: false, nx: 0, ny: 0, depth: 0 };
  const d = Math.sqrt(d2) || 0.0001;
  const depth = r - d;
  return { hit: true, nx: dx / d, ny: dy / d, depth };
}

export function resolveCircleMovement(
  x: number,
  y: number,
  radius: number,
  delta: Vec2,
  obstacles: readonly Obstacle[],
  mapW: number,
  mapH: number,
): Vec2 {
  let px = x + delta.x;
  let py = y + delta.y;

  const minX = radius;
  const minY = radius;
  const maxX = mapW * TILE_W - radius;
  const maxY = mapH * TILE_W - radius;
  px = Math.max(minX, Math.min(maxX, px));
  py = Math.max(minY, Math.min(maxY, py));

  for (let iter = 0; iter < 4; iter++) {
    for (const o of obstacles) {
      if (!o.blocksMovement) continue;
      const hit = circleVsAabb(px, py, radius, o);
      if (hit.hit) {
        px += hit.nx * hit.depth;
        py += hit.ny * hit.depth;
      }
    }
  }
  return vec2(px, py);
}

export function isBlockedAt(
  x: number,
  y: number,
  radius: number,
  obstacles: readonly Obstacle[],
): boolean {
  for (const o of obstacles) {
    if (!o.blocksMovement) continue;
    if (circleVsAabb(x, y, radius, o).hit) return true;
  }
  return false;
}

export function slideMove(
  x: number,
  y: number,
  radius: number,
  delta: Vec2,
  obstacles: readonly Obstacle[],
  mapW: number,
  mapH: number,
): Vec2 {
  const dist = Math.hypot(delta.x, delta.y);
  const maxStep = Math.max(radius * 0.5, 4);
  const steps = Math.max(1, Math.ceil(dist / maxStep));
  let px = x;
  let py = y;
  for (let i = 0; i < steps; i++) {
    const sub = vec2(delta.x / steps, delta.y / steps);
    const afterX = resolveCircleMovement(px, py, radius, vec2(sub.x, 0), obstacles, mapW, mapH);
    const afterY = resolveCircleMovement(afterX.x, afterX.y, radius, vec2(0, sub.y), obstacles, mapW, mapH);
    px = afterY.x;
    py = afterY.y;
  }
  return vec2(px, py);
}
