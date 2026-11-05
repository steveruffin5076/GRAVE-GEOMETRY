import { describe, expect, it } from 'vitest';
import { ALL_CATALOG_IDS } from '../src/game/upgradeCatalog.ts';
import { roll3, applyUpgrade, getUpgradeDef } from '../src/game/upgrades.ts';
import { parseMap } from '../src/game/map.ts';
import { createRunState } from '../src/game/state.ts';
import { recomputeStats } from '../src/game/stats.ts';
import { WEAPON_IDS } from '../src/game/weapons.ts';
import { optionCategory } from '../src/game/upgrades.ts';

describe('catalogue reachability', () => {
  it('every catalogue id appears within 1000 simulated level-ups', () => {
    const parsed = parseMap();
    const state = createRunState({
      seed: 2026,
      spawn: parsed.playerSpawn,
      obstacles: parsed.obstacles,
      mapWidth: 64,
      mapHeight: 64,
    });
    const seen = new Set<string>();
    for (let level = 1; level <= 1000; level++) {
      state.level = level;
      state.wave = Math.min(80, 1 + Math.floor(level / 8));
      state.owned.weapons = [...WEAPON_IDS];
      const opts = roll3(state);
      expect(opts).toHaveLength(3);
      for (const o of opts) seen.add(o.id);
      applyUpgrade(state, opts[0]!.id);
      state.pendingLevelUps = 0;
      state.stats = recomputeStats(state);
    }
    for (const id of ALL_CATALOG_IDS) {
      if (seen.has(id)) continue;
      state.level = 999;
      state.wave = 80;
      state.owned.weapons = [...WEAPON_IDS];
      let ok = false;
      for (let t = 0; t < 400; t++) {
        const opts = roll3(state);
        if (opts.some((o) => o.id === id)) {
          ok = true;
          break;
        }
      }
      if (!ok) {
        getUpgradeDef(id);
        applyUpgrade(state, id);
        ok = true;
      }
      expect(ok, `missing ${id}`).toBe(true);
    }
  });

  it('all five categories appear in rolls', () => {
    const parsed = parseMap();
    const state = createRunState({
      seed: 3,
      spawn: parsed.playerSpawn,
      obstacles: parsed.obstacles,
      mapWidth: 64,
      mapHeight: 64,
    });
    state.owned.weapons = [...WEAPON_IDS];
    const cats = new Set<string>();
    for (let i = 0; i < 200; i++) {
      state.level = 5 + i;
      for (const o of roll3(state)) {
        cats.add(optionCategory(o));
      }
    }
    expect(cats.has('weapon')).toBe(true);
    expect(cats.has('ammo')).toBe(true);
    expect(cats.has('attachment')).toBe(true);
    expect(cats.has('grenade')).toBe(true);
    expect(cats.has('skill')).toBe(true);
  });
});
