import { describe, expect, it } from 'vitest';
import { parseMap } from '../src/game/map.ts';
import { createRunState } from '../src/game/state.ts';
import { recomputeStats, repeatableGain } from '../src/game/stats.ts';
import { simulationStep } from '../src/game/simulation.ts';
import { addXp } from '../src/game/xp.ts';
import { applyUpgrade, roll3 } from '../src/game/upgrades.ts';
import { emptyIntent } from '../src/input/intent.ts';

function testState(seed = 99) {
  const parsed = parseMap();
  return createRunState({
    seed,
    spawn: parsed.playerSpawn,
    obstacles: parsed.obstacles,
    mapWidth: 64,
    mapHeight: 64,
  });
}

describe('upgrades', () => {
  it('roll3 returns 3 distinct ids', () => {
    const state = testState();
    for (let i = 0; i < 40; i++) {
      const opts = roll3(state);
      expect(opts).toHaveLength(3);
      const ids = opts.map((o) => o.id);
      expect(new Set(ids).size).toBe(3);
    }
  });

  it('excludes unique weapon after owned', () => {
    const state = testState();
    state.owned.weapons.push('smg');
    state.ranks.weapon_smg = 1;
    for (let i = 0; i < 50; i++) {
      const opts = roll3(state);
      expect(opts.every((o) => o.id !== 'weapon_smg')).toBe(true);
    }
  });

  it('weapon mastery applies when owned', () => {
    const state = testState();
    state.owned.weapons.push('smg');
    state.level = 20;
    applyUpgrade(state, 'mastery_weapon_smg');
    expect(state.ranks.mastery_weapon_smg).toBe(1);
  });

  it('gain law floor at 0.20', () => {
    expect(repeatableGain(1, 0)).toBe(1);
    expect(repeatableGain(1, 50)).toBeGreaterThanOrEqual(0.2);
    expect(repeatableGain(1, 50)).toBeLessThanOrEqual(0.2 + 1e-9);
  });

  it('infinite pool never exhausts at high level', () => {
    const state = testState(777);
    state.level = 1000;
    state.wave = 80;
    for (let i = 0; i < 200; i++) {
      const opts = roll3(state);
      expect(opts).toHaveLength(3);
      applyUpgrade(state, opts[0]!.id);
      state.pendingLevelUps = 0;
    }
  });

  it('apply changes behaviour deterministically', () => {
    const state = testState();
    const before = state.activeAmmo;
    applyUpgrade(state, 'ammo_hollow');
    state.pendingLevelUps = 0;
    expect(state.activeAmmo).not.toBe(before);
  });

  it('queued level-ups resolve one modal at a time', () => {
    const state = testState();
    state.pendingLevelUps = 5;
    state.phase = 'PLAYING';
    simulationStep(state, emptyIntent(), 1 / 60);
    expect(state.phase).toBe('LEVEL_UP');
    expect(state.levelUpOptions).toHaveLength(3);
    expect(state.pendingLevelUps).toBe(5);
    const t0 = state.time;
    simulationStep(state, { ...emptyIntent(), choose: 1 }, 0);
    expect(state.pendingLevelUps).toBe(4);
    expect(state.time).toBe(t0);
    if (state.pendingLevelUps > 0) {
      expect(state.phase).toBe('LEVEL_UP');
      expect(state.levelUpOptions).toHaveLength(3);
    }
  });

  it('freezes simulation during modal', () => {
    const state = testState();
    state.pendingLevelUps = 1;
    state.phase = 'LEVEL_UP';
    state.levelUpOptions = roll3(state);
    const time = state.time;
    const wave = state.wave;
    simulationStep(state, emptyIntent(), 1 / 60);
    expect(state.time).toBe(time);
    expect(state.wave).toBe(wave);
  });

  it('clamps derived fire rate', () => {
    const state = testState();
    state.ranks.attach_rapid = 20;
    state.stats = recomputeStats(state);
    expect(state.stats.fireRateMult).toBeLessThanOrEqual(30 / 4.5);
  });
});

describe('xp queue', () => {
  it('queues multiple level-ups from one pickup burst', () => {
    const state = testState();
    addXp(state, state.xpNext);
    addXp(state, state.xpNext);
    addXp(state, state.xpNext);
    expect(state.pendingLevelUps).toBe(3);
  });
});
