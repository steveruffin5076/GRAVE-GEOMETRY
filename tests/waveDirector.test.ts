import { describe, expect, it } from 'vitest';
import {
  concurrentCap,
  computeWave,
  eliteChance,
  spawnIntervalSeconds,
  updateSpawnDirector,
  waveBudget,
  waveStatScalar,
} from '../src/game/zombies/spawnDirector.ts';
import { parseMap } from '../src/game/map.ts';
import { createRunState } from '../src/game/state.ts';
import { spawnZombie } from '../src/game/zombies/spawnZombie.ts';
import { pickVariantForWave } from '../src/game/zombies/weights.ts';
import { createRng } from '../src/core/math/rng.ts';
import { initPlatformCaps } from '../src/config/platform.ts';

initPlatformCaps();

describe('waveDirector', () => {
  it('wave index grows with elapsed time', () => {
    expect(computeWave(0)).toBe(1);
    expect(computeWave(29.9)).toBe(1);
    expect(computeWave(30)).toBe(2);
  });

  it('budget is monotonic until cap', () => {
    let prev = 0;
    for (let w = 1; w <= 40; w++) {
      const b = waveBudget(w);
      expect(b).toBeGreaterThanOrEqual(prev);
      prev = b;
    }
  });

  it('spawn interval respects minimum', () => {
    for (let w = 1; w <= 20; w++) {
      expect(spawnIntervalSeconds(w)).toBeGreaterThanOrEqual(0.05);
      expect(spawnIntervalSeconds(w)).toBeLessThanOrEqual(1.4);
    }
  });

  it('concurrent cap never exceeds platform max', () => {
    for (let w = 1; w <= 50; w++) {
      expect(concurrentCap(w)).toBeLessThanOrEqual(700);
    }
  });

  it('elite chance clamp matches plan', () => {
    expect(eliteChance(11)).toBe(0);
    expect(eliteChance(50)).toBeLessThanOrEqual(0.35);
  });

  it('stat scalar grows with wave', () => {
    expect(waveStatScalar(1)).toBe(1);
    expect(waveStatScalar(20)).toBeGreaterThan(waveStatScalar(1));
  });

  it('variant gating excludes locked variants early', () => {
    const rng = createRng(7);
    for (let i = 0; i < 50; i++) {
      expect(pickVariantForWave(rng, 1)).toBe('walker');
    }
  });

  it('deferred spawns drain when under concurrent cap', () => {
    const parsed = parseMap();
    const state = createRunState({
      seed: 3,
      spawn: parsed.playerSpawn,
      obstacles: parsed.obstacles,
      mapWidth: 64,
      mapHeight: 64,
    });
    state.spawn.wave = 5;
    state.wave = 5;
    state.time = 4 * 30;
    state.spawn.budgetThisWave = 999;
    state.spawn.spawnedThisWave = 0;
    state.spawn.deferredSpawns = 5;
    state.spawn.spawnTimer = 999;
    const cap = concurrentCap(5);
    for (let i = 0; i < cap - 1; i++) {
      spawnZombie(state, 'walker', state.player.x + 500 + i * 2, state.player.y + 500, {
        elite: null,
      });
    }
    const before = state.spawn.deferredSpawns;
    updateSpawnDirector(state, 0.01);
    expect(state.spawn.deferredSpawns).toBeLessThan(before);
    expect(state.spawn.spawnedThisWave).toBeGreaterThan(0);
  });
});
