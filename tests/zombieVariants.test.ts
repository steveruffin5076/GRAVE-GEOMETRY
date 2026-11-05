import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance.ts';
import { COMBAT_VARIANTS, telegraphDurationSeconds } from '../src/game/zombies/types.ts';
import { eliteChance, pickVariantForWave } from '../src/game/zombies/spawnDirector.ts';
import { createRng } from '../src/core/math/rng.ts';
import { parseMap } from '../src/game/map.ts';
import { createRunState } from '../src/game/state.ts';
import { spawnZombie } from '../src/game/zombies/spawnZombie.ts';
import { updateZombies } from '../src/game/zombies/behaviors.ts';
import { emptyIntent } from '../src/input/intent.ts';
import { simulationStep } from '../src/game/simulation.ts';

function baseState(seed = 1) {
  const parsed = parseMap();
  return createRunState({
    seed,
    spawn: parsed.playerSpawn,
    obstacles: parsed.obstacles,
    mapWidth: 64,
    mapHeight: 64,
  });
}

describe('zombie variants', () => {
  it('defines eight combat variants plus spawnling', () => {
    expect(COMBAT_VARIANTS).toHaveLength(8);
    expect(BALANCE.zombies.variants.spawnling).toBeDefined();
  });

  it('telegraph durations meet minimum 0.4s', () => {
    expect(BALANCE.zombies.telegraphMinSeconds).toBeGreaterThanOrEqual(0.4);
    expect(telegraphDurationSeconds('jumper', 'leap')).toBeGreaterThanOrEqual(0.4);
    expect(telegraphDurationSeconds('charger', 'dash')).toBeGreaterThanOrEqual(0.4);
    expect(telegraphDurationSeconds('boomer', 'explode')).toBeGreaterThanOrEqual(0.4);
    expect(telegraphDurationSeconds('tank', 'slam')).toBeGreaterThanOrEqual(0.4);
    expect(telegraphDurationSeconds('spitter', 'spit')).toBeGreaterThanOrEqual(0.4);
  });

  it('elite chance clamps', () => {
    expect(eliteChance(1)).toBe(0);
    expect(eliteChance(12)).toBeCloseTo(0.05, 2);
    expect(eliteChance(100)).toBeLessThanOrEqual(0.35);
  });

  it('pickVariant unlocks runner by wave 3', () => {
    const rng = createRng(99);
    const state = baseState(99);
    state.rng = rng;
    let runner = false;
    for (let i = 0; i < 80; i++) {
      if (pickVariantForWave(state.rng, 5) === 'runner') runner = true;
    }
    expect(runner).toBe(true);
  });

  it('splitter spawns spawnlings on death', () => {
    const state = baseState(2);
    state.spawn.wave = 5;
    const z = spawnZombie(state, 'splitter', state.player.x + 80, state.player.y, { elite: null });
    expect(z).not.toBeNull();
    z!.hp = 0;
    const before = state.zombies.length;
    updateZombies(state, 1 / 60);
    expect(state.zombies.length).toBeGreaterThan(before);
  });

  it('charger enters telegraph before dash', () => {
    const state = baseState(3);
    state.spawn.wave = 10;
    const z = spawnZombie(state, 'charger', state.player.x + 40, state.player.y + 10, { elite: null });
    expect(z).not.toBeNull();
    z!.abilityCooldown = 0;
    z!.state = 'SEEK';
    let saw = false;
    for (let i = 0; i < 120; i++) {
      updateZombies(state, 1 / 60);
      const st = state.zombies.find((x) => x.id === z!.id)?.state;
      if (st === 'TELEGRAPH' && z!.telegraphTimer >= 0.4) saw = true;
    }
    expect(saw).toBe(true);
  });

  it('simulation stays finite with mixed variants', () => {
    const state = baseState(4);
    state.player.hp = 5000;
    state.player.maxHp = 5000;
    state.spawn.wave = 12;
    state.wave = 12;
    const intent = emptyIntent();
    intent.fire = false;
    for (let i = 0; i < 600; i++) {
      if (state.phase === 'LEVEL_UP') intent.choose = 1;
      else intent.choose = null;
      simulationStep(state, intent, 1 / 60);
      expect(Number.isFinite(state.player.hp)).toBe(true);
      expect(state.zombies.length).toBeLessThanOrEqual(700);
    }
  });
});
