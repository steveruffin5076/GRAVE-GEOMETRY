import { BALANCE } from '../../config/balance.ts';
import { isMobilePlatform } from '../../config/platform.ts';
import { WAVE_SECONDS } from '../../config/constants.ts';
import { nextFloat } from '../../core/math/rng.ts';
import { isBlockedAt } from '../collision.ts';
import type { RunState } from '../state.ts';
import { canSpawnZombie } from './spawnCaps.ts';
import { getVariant } from './types.ts';
import { pickVariantForWave } from './weights.ts';
import { spawnZombie } from './spawnZombie.ts';
import type { ZombieVariantId } from './types.ts';

export interface SpawnState {
  wave: number;
  waveElapsed: number;
  spawnTimer: number;
  spawnedThisWave: number;
  budgetThisWave: number;
  deferredSpawns: number;
  titanPending: boolean;
}

function isMobileCap(): boolean {
  return isMobilePlatform();
}

export function waveStatScalar(wave: number): number {
  return 1 + BALANCE.waves.statScalarPerWave * (wave - 1);
}

export { concurrentCap } from './spawnCaps.ts';

export function maxPerWave(): number {
  return isMobileCap() ? BALANCE.performance.maxPerWaveMobile : BALANCE.performance.maxPerWaveDesktop;
}

export function computeWave(time: number): number {
  return Math.floor(time / WAVE_SECONDS) + 1;
}

export function waveBudget(wave: number): number {
  return Math.min(Math.ceil(6 * 1.12 ** (wave - 1) + 0.6 * wave), maxPerWave());
}

export function spawnIntervalSeconds(wave: number): number {
  const budget = waveBudget(wave);
  return Math.max(0.05, Math.min(1.4, WAVE_SECONDS / budget));
}

export function createSpawnState(): SpawnState {
  const w = 1;
  return {
    wave: w,
    waveElapsed: 0,
    spawnTimer: 0,
    spawnedThisWave: 0,
    budgetThisWave: waveBudget(w),
    deferredSpawns: 0,
    titanPending: false,
  };
}

function trySpawnPosition(state: RunState, radius: number): { x: number; y: number } | null {
  const p = state.player;
  for (let i = 0; i < 16; i++) {
    const angle = nextFloat(state.rng) * Math.PI * 2;
    const dist =
      BALANCE.zombies.spawnMinDist +
      nextFloat(state.rng) * (BALANCE.zombies.spawnMaxDist - BALANCE.zombies.spawnMinDist);
    const x = p.x + Math.cos(angle) * dist;
    const y = p.y + Math.sin(angle) * dist;
    if (isBlockedAt(x, y, radius, state.obstacles)) continue;
    if (Math.hypot(x - p.x, y - p.y) < BALANCE.zombies.spawnMinDist) continue;
    return { x, y };
  }
  return null;
}

function spawnAt(state: RunState, variant: ZombieVariantId, forceTitan = false): boolean {
  const def = getVariant(variant);
  const pos = trySpawnPosition(state, def.radius);
  if (pos === null) return false;
  const spawned = spawnZombie(state, variant, pos.x, pos.y, { forceTitan });
  if (spawned === null) return false;
  if (forceTitan) {
    state.presentation.push({ type: 'titanSpawn', wave: state.spawn.wave });
  }
  return true;
}

function nextSpawnVariant(state: RunState): { id: ZombieVariantId; titan: boolean } {
  if (state.spawn.titanPending && BALANCE.ENABLE_TITANS) {
    state.spawn.titanPending = false;
    return { id: 'tank', titan: true };
  }
  return { id: pickVariantForWave(state.rng, state.spawn.wave), titan: false };
}

export function updateSpawnDirector(state: RunState, dt: number): void {
  const spawn = state.spawn;
  spawn.waveElapsed += dt;
  const newWave = computeWave(state.time);
  if (newWave !== spawn.wave) {
    spawn.wave = newWave;
    spawn.waveElapsed = 0;
    spawn.spawnedThisWave = 0;
    spawn.budgetThisWave = waveBudget(newWave);
    spawn.spawnTimer = 0;
    state.waveKills = 0;
    if (BALANCE.ENABLE_TITANS && newWave >= 10 && newWave % 10 === 0) {
      spawn.titanPending = true;
    }
    state.presentation.push({ type: 'waveStart', wave: newWave });
  }
  state.wave = spawn.wave;

  const tryOne = (): boolean => {
    const next = nextSpawnVariant(state);
    return spawnAt(state, next.id, next.titan);
  };

  const maxDrain = BALANCE.performance.maxDeferredDrainPerTick;
  for (
    let n = 0;
    n < maxDrain &&
    spawn.deferredSpawns > 0 &&
    canSpawnZombie(state) &&
    spawn.spawnedThisWave < spawn.budgetThisWave;
    n += 1
  ) {
    if (!tryOne()) break;
    spawn.spawnedThisWave += 1;
    spawn.deferredSpawns -= 1;
  }

  if (spawn.spawnedThisWave >= spawn.budgetThisWave) return;

  spawn.spawnTimer -= dt;
  if (spawn.spawnTimer > 0) return;

  spawn.spawnTimer = spawnIntervalSeconds(spawn.wave);

  if (!canSpawnZombie(state)) {
    spawn.deferredSpawns += 1;
    return;
  }

  if (!tryOne()) {
    spawn.deferredSpawns += 1;
    return;
  }
  spawn.spawnedThisWave += 1;
}

export { eliteChance } from './weights.ts';
export { pickVariantForWave } from './weights.ts';
