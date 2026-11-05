import { BALANCE } from '../../config/balance.ts';
import type { RunState } from '../state.ts';

export function trimAcidPools(state: RunState): void {
  const max = BALANCE.performance.maxGrenadeFields;
  if (state.acidPools.length > max) {
    state.acidPools = state.acidPools.slice(0, max);
  }
}

export function updateAcidPools(state: RunState, dt: number): void {
  const keep = [];
  const p = state.player;
  for (const pool of state.acidPools) {
    pool.timer -= dt;
    if (pool.timer <= 0) continue;
    const d = Math.hypot(p.x - pool.x, p.y - pool.y);
    if (d <= pool.radius + p.hitRadius && p.iFrameTimer <= 0) {
      const falloff = Math.max(0.25, 1 - d / pool.radius);
      const dmg = pool.dps * dt * falloff * state.stats.damageTakenMult;
      p.hp -= dmg;
      if (p.hp <= 0) p.hp = 0;
    }
    keep.push(pool);
  }
  state.acidPools = keep.slice(0, BALANCE.performance.maxGrenadeFields);
}
