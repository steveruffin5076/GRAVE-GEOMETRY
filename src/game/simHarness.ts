import { BALANCE } from '../config/balance.ts';
import { isMobilePlatform } from '../config/platform.ts';
import { concurrentCap } from './zombies/spawnCaps.ts';
import { maxPerWave } from './zombies/spawnDirector.ts';
import type { RunState } from './state.ts';
import type { InputIntent } from '../input/intent.ts';
import { simulationStep } from './simulation.ts';

export function simulationTick(
  state: RunState,
  intent: InputIntent,
  dt = 1 / 60,
): void {
  let guard = 0;
  while (state.phase === 'LEVEL_UP' && intent.choose !== null && guard++ < 64) {
    simulationStep(state, intent, 0);
  }
  if (state.phase === 'PLAYING') {
    simulationStep(state, intent, dt);
  }
}

export interface PerformanceCaps {
  zombies: number;
  bullets: number;
  shards: number;
  grenadeFields: number;
}

export function performanceCaps(): PerformanceCaps {
  const mobile = isMobilePlatform();
  return {
    zombies: mobile ? BALANCE.performance.maxZombiesMobile : BALANCE.performance.maxZombiesDesktop,
    bullets: mobile ? BALANCE.performance.maxBulletsMobile : BALANCE.performance.maxBulletsDesktop,
    shards: mobile ? BALANCE.performance.maxShardsMobile : BALANCE.performance.maxShardsDesktop,
    grenadeFields: BALANCE.performance.maxGrenadeFields,
  };
}

function assertFinite(n: number, label: string): void {
  if (!Number.isFinite(n)) {
    throw new Error(`${label} is not finite (${String(n)})`);
  }
}

export function assertRunStateFinite(state: RunState): void {
  assertFinite(state.time, 'time');
  assertFinite(state.player.x, 'player.x');
  assertFinite(state.player.y, 'player.y');
  assertFinite(state.player.hp, 'player.hp');
  assertFinite(state.level, 'level');
  assertFinite(state.wave, 'wave');
  assertFinite(state.xp, 'xp');
  assertFinite(state.combatDps, 'combatDps');
  for (const z of state.zombies) {
    if (!z.active) continue;
    assertFinite(z.x, 'zombie.x');
    assertFinite(z.y, 'zombie.y');
    assertFinite(z.hp, 'zombie.hp');
  }
  for (const b of state.bullets) {
    if (!b.active) continue;
    assertFinite(b.x, 'bullet.x');
    assertFinite(b.y, 'bullet.y');
  }
}

export function assertRunStateBounded(state: RunState): void {
  const caps = performanceCaps();
  const alive = state.zombies.filter((z) => z.active && z.state !== 'DYING').length;
  if (alive > concurrentCap(state.wave)) {
    throw new Error(`zombie concurrent ${alive} > cap ${concurrentCap(state.wave)}`);
  }
  if (state.zombies.length > caps.zombies) {
    throw new Error(`zombie pool list ${state.zombies.length} > ${caps.zombies}`);
  }
  if (state.bullets.length > caps.bullets) {
    throw new Error(`bullets ${state.bullets.length} > ${caps.bullets}`);
  }
  if (state.shards.length > caps.shards) {
    throw new Error(`shards ${state.shards.length} > ${caps.shards}`);
  }
  if (state.acidPools.length > caps.grenadeFields) {
    throw new Error(`acidPools ${state.acidPools.length} > ${caps.grenadeFields}`);
  }
  if (state.grenadeFields.length > caps.grenadeFields) {
    throw new Error(`grenadeFields ${state.grenadeFields.length} > ${caps.grenadeFields}`);
  }
  if (state.spawn.deferredSpawns > maxPerWave() * 20) {
    throw new Error(`deferred queue runaway: ${state.spawn.deferredSpawns}`);
  }
}
