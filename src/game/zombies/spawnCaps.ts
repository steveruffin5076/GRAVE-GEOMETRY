import { BALANCE } from '../../config/balance.ts';
import { isMobilePlatform } from '../../config/platform.ts';
import type { RunState } from '../state.ts';

export function activeZombieCount(state: RunState): number {
  return state.zombies.filter((z) => z.active && z.state !== 'DYING').length;
}

export function concurrentCap(wave: number): number {
  const cap = isMobilePlatform()
    ? BALANCE.performance.maxZombiesMobile
    : BALANCE.performance.maxZombiesDesktop;
  return Math.min(120 + 12 * wave, cap);
}

export function canSpawnZombie(state: RunState): boolean {
  const maxPool = isMobilePlatform()
    ? BALANCE.performance.maxZombiesMobile
    : BALANCE.performance.maxZombiesDesktop;
  if (state.zombies.length >= maxPool) return false;
  return activeZombieCount(state) < concurrentCap(state.spawn.wave);
}
