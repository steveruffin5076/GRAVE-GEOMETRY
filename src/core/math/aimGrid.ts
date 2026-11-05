import { screenToWorld } from './iso.ts';
import { len, normalize, vec2, type Vec2 } from './vec2.ts';

export function aimAtGridUnderDrawPoint(
  drawX: number,
  drawY: number,
  playerWorldX: number,
  playerWorldY: number,
  previousAim: Vec2,
  minGridDist = 8,
): Vec2 {
  const target = screenToWorld(drawX, drawY);
  const dx = target.x - playerWorldX;
  const dy = target.y - playerWorldY;
  if (len(vec2(dx, dy)) < minGridDist) {
    return len(previousAim) > 0.01 ? previousAim : { x: 1, y: 0 };
  }
  return normalize(vec2(dx, dy));
}
