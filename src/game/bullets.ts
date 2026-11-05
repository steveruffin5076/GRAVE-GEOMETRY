import { BALANCE } from '../config/balance.ts';
import { createObjectPool, type PooledItem } from '../core/objectPool.ts';
import type { Vec2 } from '../core/math/vec2.ts';
import { vec2 } from '../core/math/vec2.ts';
import type { Obstacle } from './map.ts';
import type { RunState } from './state.ts';
import type { Zombie } from './zombieEntity.ts';
import { applyBulletHitDamage, applyBulletHitZombie } from './damage.ts';
import type { WeaponDef } from './weapons.ts';

export interface Bullet extends PooledItem {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  pierceLeft: number;
  rangeLeft: number;
}

let nextBulletId = 1;

function bulletCapacity(): number {
  const mobile = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  return mobile ? BALANCE.performance.maxBulletsMobile : BALANCE.performance.maxBulletsDesktop;
}

export function createBulletPool(): ReturnType<typeof createObjectPool<Bullet>> {
  return createObjectPool<Bullet>(
    bulletCapacity(),
    () => ({
      active: false,
      id: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      damage: 0,
      pierceLeft: 0,
      rangeLeft: 0,
    }),
    (b) => {
      b.id = 0;
      b.x = 0;
      b.y = 0;
      b.vx = 0;
      b.vy = 0;
      b.damage = 0;
      b.pierceLeft = 0;
      b.rangeLeft = 0;
    },
  );
}

export function spawnBullet(
  state: RunState,
  x: number,
  y: number,
  dir: Vec2,
  def: WeaponDef,
): void {
  const bullet = state.bulletPool.acquire();
  bullet.id = nextBulletId++;
  bullet.x = x;
  bullet.y = y;
  bullet.vx = dir.x * def.projectileSpeed;
  bullet.vy = dir.y * def.projectileSpeed;
  bullet.damage = def.damage;
  bullet.pierceLeft = def.pierce;
  bullet.rangeLeft = def.range;
  state.bullets.push(bullet);
}

function segmentHitsObstacle(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  obstacles: readonly Obstacle[],
): Obstacle | null {
  for (const o of obstacles) {
    if (!o.blocksBullets) continue;
    if (segmentIntersectsAabb(x0, y0, x1, y1, o)) return o;
  }
  return null;
}

function segmentIntersectsAabb(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  o: Obstacle,
): boolean {
  const minX = o.x - o.halfW;
  const maxX = o.x + o.halfW;
  const minY = o.y - o.halfH;
  const maxY = o.y + o.halfH;
  return lineIntersectsAabb(x0, y0, x1, y1, minX, minY, maxX, maxY);
}

function segmentsIntersect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): boolean {
  const cross = (ax: number, ay: number, bx: number, by: number): number => ax * by - ay * bx;
  const d1 = cross(x3 - x2, y3 - y2, x0 - x2, y0 - y2);
  const d2 = cross(x3 - x2, y3 - y2, x1 - x2, y1 - y2);
  const d3 = cross(x1 - x0, y1 - y0, x2 - x0, y2 - y0);
  const d4 = cross(x1 - x0, y1 - y0, x3 - x0, y3 - y0);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

export function lineIntersectsAabb(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): boolean {
  if (
    Math.max(x0, x1) < minX ||
    Math.min(x0, x1) > maxX ||
    Math.max(y0, y1) < minY ||
    Math.min(y0, y1) > maxY
  ) {
    return false;
  }
  const inside = (x: number, y: number): boolean =>
    x >= minX && x <= maxX && y >= minY && y <= maxY;
  if (inside(x0, y0) || inside(x1, y1)) return true;
  const edges: [number, number, number, number][] = [
    [minX, minY, maxX, minY],
    [maxX, minY, maxX, maxY],
    [maxX, maxY, minX, maxY],
    [minX, maxY, minX, minY],
  ];
  for (const [ax, ay, bx, by] of edges) {
    if (segmentsIntersect(x0, y0, x1, y1, ax, ay, bx, by)) return true;
  }
  return false;
}

function segmentHitZombie(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  zombies: readonly Zombie[],
): Zombie | null {
  let best: { z: Zombie; t: number } | null = null;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy;
  for (const z of zombies) {
    if (!z.active || z.state === 'SPAWNING' || z.state === 'DYING') continue;
    let t = 0;
    if (lenSq > 0) {
      t = ((z.x - x0) * dx + (z.y - y0) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }
    const cx = x0 + dx * t;
    const cy = y0 + dy * t;
    const dist = Math.hypot(z.x - cx, z.y - cy);
    if (dist <= z.radius) {
      if (best === null || t < best.t) best = { z, t };
    }
  }
  return best?.z ?? null;
}

export function updateBullets(state: RunState, dt: number): void {
  const keep: Bullet[] = [];
  for (const b of state.bullets) {
    if (!b.active) continue;
    const x0 = b.x;
    const y0 = b.y;
    const step = vec2(b.vx * dt, b.vy * dt);
    const dist = Math.hypot(step.x, step.y);
    if (dist <= 0 || b.rangeLeft <= 0) {
      state.bulletPool.release(b);
      continue;
    }
    const travel = Math.min(dist, b.rangeLeft);
    const scale = travel / dist;
    const x1 = x0 + step.x * scale;
    const y1 = y0 + step.y * scale;

    const zHit = segmentHitZombie(x0, y0, x1, y1, state.zombies);
    if (zHit !== null) {
      applyBulletHitZombie(state, zHit, b);
      if (b.pierceLeft > 0) {
        b.pierceLeft -= 1;
        b.x = x1;
        b.y = y1;
        b.rangeLeft -= travel;
        keep.push(b);
      } else {
        state.bulletPool.release(b);
      }
      continue;
    }

    const hit = segmentHitsObstacle(x0, y0, x1, y1, state.obstacles);
    if (hit !== null) {
      state.presentation.push({ type: 'hit', x: x1, y: y1, damage: b.damage });
      applyBulletHitDamage(state, b.damage, hit);
      if (b.pierceLeft > 0) {
        b.pierceLeft -= 1;
        b.x = x1;
        b.y = y1;
        b.rangeLeft -= travel;
        keep.push(b);
      } else {
        state.bulletPool.release(b);
      }
      continue;
    }

    b.x = x1;
    b.y = y1;
    b.rangeLeft -= travel;
    if (b.rangeLeft <= 0) {
      state.bulletPool.release(b);
    } else {
      keep.push(b);
    }
  }
  state.bullets = keep;
}

/** Headless sweep test helper — returns first blocking obstacle along motion. */
export function sweepFirstObstacle(
  x0: number,
  y0: number,
  vx: number,
  vy: number,
  dt: number,
  obstacles: readonly Obstacle[],
): Obstacle | null {
  const x1 = x0 + vx * dt;
  const y1 = y0 + vy * dt;
  return segmentHitsObstacle(x0, y0, x1, y1, obstacles);
}
