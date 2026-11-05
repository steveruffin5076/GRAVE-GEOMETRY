import { BALANCE } from '../../config/balance.ts';
import type { RunState } from '../state.ts';
import { recordDamageTaken } from '../runStats.ts';
import type { Zombie } from '../zombieEntity.ts';

export function explodeBoomer(
  state: RunState,
  z: Zombie,
  chainDepth: number,
): void {
  if (chainDepth > BALANCE.zombies.boomerChainMaxDepth) return;
  const cx = z.x;
  const cy = z.y;
  const r = BALANCE.zombies.boomerRadius;
  const peak = BALANCE.zombies.boomerDamage;
  const p = state.player;
  const pd = Math.hypot(p.x - cx, p.y - cy);
  if (pd <= r + p.hitRadius && p.iFrameTimer <= 0) {
    const falloff = Math.max(0.25, 1 - pd / r);
    const taken = peak * falloff * state.stats.damageTakenMult;
    p.hp -= taken;
    recordDamageTaken(state, taken);
    p.iFrameTimer = BALANCE.player.hitIFrames;
    p.slowTimer = Math.max(p.slowTimer, BALANCE.zombies.boomerSlowDuration);
    state.presentation.push({ type: 'playerHurt', damage: taken });
  }
  for (const other of state.zombies) {
    if (!other.active || other === z || other.variant !== 'boomer') continue;
    if (other.state === 'DYING') continue;
    const d = Math.hypot(other.x - cx, other.y - cy);
    if (d <= r && other.state !== 'TELEGRAPH') {
      other.state = 'TELEGRAPH';
      other.stateTimer = BALANCE.zombies.boomerTelegraph;
      other.telegraphTimer = BALANCE.zombies.boomerTelegraph;
      other.telegraphShape = 'pulse';
      other.boomerChainDepth = chainDepth + 1;
    }
  }
  state.presentation.push({ type: 'explosion', x: cx, y: cy, radius: r, damage: peak });
}
