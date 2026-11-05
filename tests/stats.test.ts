import { describe, expect, it } from 'vitest';
import { parseMap } from '../src/game/map.ts';
import { createRunState } from '../src/game/state.ts';
import { recomputeStats } from '../src/game/stats.ts';

describe('stats', () => {
  it('recompute is order-independent for rank sets', () => {
    const parsed = parseMap();
    const base = createRunState({
      seed: 1,
      spawn: parsed.playerSpawn,
      obstacles: parsed.obstacles,
      mapWidth: 64,
      mapHeight: 64,
    });
    const a = createRunState({
      seed: 1,
      spawn: parsed.playerSpawn,
      obstacles: parsed.obstacles,
      mapWidth: 64,
      mapHeight: 64,
    });
    a.ranks = { skill_fleetfoot: 4, skill_vitality: 2, ammo_hollow: 3 };
    const b = createRunState({
      seed: 1,
      spawn: parsed.playerSpawn,
      obstacles: parsed.obstacles,
      mapWidth: 64,
      mapHeight: 64,
    });
    b.ranks = { ammo_hollow: 3, skill_vitality: 2, skill_fleetfoot: 4 };
    expect(recomputeStats(a)).toEqual(recomputeStats(b));
    expect(recomputeStats(base).moveSpeed).toBe(base.player.moveSpeed);
  });
});
