import { BALANCE } from '../../config/balance.ts';
import type { RunState } from '../state.ts';
import { releaseZombie, type Zombie } from '../zombieEntity.ts';
import { spawnSplitterChildren } from './variantBehaviors.ts';
import { recordKillComboPeak } from '../runStats.ts';
import { spawnXpShard } from '../zombieEntity.ts';

export function killZombie(state: RunState, z: Zombie): void {
  if (z.state === 'DYING') return;

  if (z.volatileOnDeath) {
    state.acidPools.push({
      x: z.x,
      y: z.y,
      radius: BALANCE.zombies.acidPoolRadius,
      dps: BALANCE.zombies.acidPoolDps * 2,
      timer: 2,
    });
  }

  spawnSplitterChildren(state, z);

  state.kills += 1;
  state.score += z.xpValue * 10;
  state.waveKills += 1;
  state.killsByVariant[z.variant] = (state.killsByVariant[z.variant] ?? 0) + 1;

  if (state.killComboTimer > 0) state.killComboCount += 1;
  else state.killComboCount = 1;
  state.killComboTimer = BALANCE.vfx.killComboWindowSeconds;
  if (state.killComboCount >= BALANCE.vfx.killComboMin) {
    state.presentation.push({ type: 'killCombo', count: state.killComboCount });
  }
  recordKillComboPeak(state);

  state.presentation.push({ type: 'kill', variantId: z.variant, targetId: z.id });
  spawnXpShard(state, z.x, z.y, z.xpValue);

  z.state = 'DYING';
  z.stateTimer = 0.25;
  state.presentation.push({ type: 'zombieDeath', variant: z.variant, x: z.x, y: z.y });
}

export function finishDying(state: RunState, z: Zombie): void {
  if (z.stateTimer > 0) return;
  releaseZombie(state, z);
}
