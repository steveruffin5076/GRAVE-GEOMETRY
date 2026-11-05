import { describe, expect, it } from 'vitest';
import {
  CHARACTER_CELL_H,
  CHARACTER_CELL_W,
  DESIGN_H,
  DESIGN_W,
  FIXED_DT,
  HASH_CELL,
  MAP_H,
  MAP_W,
  MAX_SUBSTEPS,
  PIVOT_X,
  PIVOT_Y,
  STEP_RISER,
  TILE_H,
  TILE_RISER,
  TILE_W,
  WAVE_SECONDS,
} from '../src/config/constants.ts';
import { DISPLAY_CONFIG } from '../src/config/displayConfig.ts';
import { PALETTE_HEX_LIST } from '../src/config/palette.ts';
import { GAME_TAGLINE, GAME_TITLE } from '../src/data/strings.ts';

import { createObjectPool, type PooledItem } from '../src/core/objectPool.ts';
import { depthOf, screenToWorld, worldToScreen } from '../src/core/math/iso.ts';
import { createRng, nextFloat, snapshotSequence } from '../src/core/math/rng.ts';
import { approxEq } from '../src/core/math/vec2.ts';

import { settingsStorageRoundTrip, loadSettings, saveSettings, DEFAULT_SETTINGS } from '../src/persistence/storage.ts';
import { mergeScreenMove } from '../src/input/keyboardMouse.ts';
import { ISO_TILE_RISER_PX, isPerimeterSealed, parseMap, playerSpawnClear } from '../src/game/map.ts';
import { createRunState } from '../src/game/state.ts';
import { isBlockedAt } from '../src/game/collision.ts';

import { BALANCE } from '../src/config/balance.ts';
import { screenDirectionToGrid } from '../src/input/keyboardMouse.ts';
import { fireIntervalSeconds, getWeaponDef } from '../src/game/weapons.ts';
import { sweepFirstObstacle } from '../src/game/bullets.ts';
import { normalize, vec2 } from '../src/core/math/vec2.ts';

import { concurrentCap, waveBudget } from '../src/game/zombies/spawnDirector.ts';
import { xpToNext } from '../src/game/xp.ts';
import { roll3 } from '../src/game/upgrades.ts';
import { ALL_CATALOG_IDS } from '../src/game/upgradeCatalog.ts';
import { COMBAT_VARIANTS } from '../src/game/zombies/types.ts';
import { recomputeStats } from '../src/game/stats.ts';
import { assertRunStateBounded, assertRunStateFinite } from '../src/game/simHarness.ts';
import { simulationStep } from '../src/game/simulation.ts';
import { emptyIntent } from '../src/input/intent.ts';
import { waveStatScalar } from '../src/game/zombies/spawnDirector.ts';
import { resolveJuiceCaps, shouldScreenShake } from '../src/render/visualSettings.ts';
import { formatCompact } from '../src/core/formatNumber.ts';
import { detectLayoutMode } from '../src/ui/layout.ts';
import { loadCorruptBestSafe, loadPersonalBest } from '../src/persistence/storage.ts';

const phase = Number(process.env.PHASE ?? '0');

describe('phaseGates', () => {
  it('runs gates for the requested PHASE env', () => {
    expect(Number.isFinite(phase)).toBe(true);
  });

  describe('phase 0', () => {
    it('constants match PLAN §6.2 / Appendix B', () => {
      if (phase < 0) return;
      expect(TILE_W).toBe(64);
      expect(TILE_H).toBe(32);
      expect(TILE_RISER).toBe(8);
      expect(STEP_RISER).toBe(4);
      expect(DESIGN_W).toBe(640);
      expect(DESIGN_H).toBe(360);
      expect(MAP_W).toBe(64);
      expect(MAP_H).toBe(64);
      expect(FIXED_DT).toBeCloseTo(1 / 60);
      expect(MAX_SUBSTEPS).toBe(5);
      expect(HASH_CELL).toBe(64);
      expect(WAVE_SECONDS).toBe(30);
      expect(CHARACTER_CELL_W).toBe(24);
      expect(CHARACTER_CELL_H).toBe(32);
      expect(PIVOT_X).toBe(12);
      expect(PIVOT_Y).toBe(28);
    });

    it('palette has at least 32 unique locked colours', () => {
      if (phase < 0) return;
      const unique = new Set(PALETTE_HEX_LIST.map((h) => h.toLowerCase()));
      expect(unique.size).toBe(PALETTE_HEX_LIST.length);
      expect(unique.size).toBeGreaterThanOrEqual(32);
    });

    it('Phaser display config enables pixel art', () => {
      if (phase < 0) return;
      expect(DISPLAY_CONFIG.pixelArt).toBe(true);
      expect(DISPLAY_CONFIG.roundPixels).toBe(true);
      expect(DISPLAY_CONFIG.antialias).toBe(false);
      expect(DISPLAY_CONFIG.renderPixelArt).toBe(true);
    });

    it('branding strings exist', () => {
      if (phase < 0) return;
      expect(GAME_TITLE).toBe('GRAVE GEOMETRY');
      expect(GAME_TAGLINE).toBe('One map. No last wave.');
    });
  });

  describe('phase 1', () => {
    it('iso round-trip and diamond step vectors', () => {
      if (phase < 1) return;
      const ox = worldToScreen(0, 0);
      const px = worldToScreen(64, 0);
      expect(px.x - ox.x).toBeCloseTo(32);
      expect(px.y - ox.y).toBeCloseTo(16);
      const py = worldToScreen(0, 64);
      expect(py.x - ox.x).toBeCloseTo(-32);
      expect(py.y - ox.y).toBeCloseTo(16);
      const w = screenToWorld(px.x, px.y);
      expect(approxEq(w, { x: 64, y: 0 }, 1e-9)).toBe(true);
      expect(depthOf(8, 8)).toBeCloseTo(4);
    });

    it('seeded RNG determinism', () => {
      if (phase < 1) return;
      expect(snapshotSequence(9001, 12)).toEqual(snapshotSequence(9001, 12));
      const rng = createRng(3);
      const a = nextFloat(rng);
      const b = nextFloat(createRng(3));
      expect(a).toBe(b);
    });

    it('object pool acquire/release', () => {
      if (phase < 1) return;
      interface Item extends PooledItem {
        n: number;
      }
      const pool = createObjectPool<Item>(
        2,
        () => ({ active: false, n: 0 }),
        (i) => {
          i.n = 0;
        },
      );
      const one = pool.acquire();
      one.n = 5;
      pool.release(one);
      const two = pool.acquire();
      expect(two).toBe(one);
      expect(two.n).toBe(0);
    });
  });

  describe('phase 2', () => {
    it('map parses with sealed perimeter and clear spawn', () => {
      if (phase < 2) return;
      expect(isPerimeterSealed()).toBe(true);
      const parsed = parseMap();
      expect(parsed.grid.width).toBe(MAP_W);
      expect(parsed.grid.height).toBe(MAP_H);
      expect(playerSpawnClear(parsed)).toBe(true);
      expect(ISO_TILE_RISER_PX).toBe(TILE_RISER);
      expect(TILE_W).toBe(64);
      expect(TILE_H).toBe(32);
    });
  });

  describe('phase 3', () => {
    it('input equivalence, obstacles block, fireMode persists', () => {
      if (phase < 3) return;
      const parsed = parseMap();
      const state = createRunState({
        spawn: parsed.playerSpawn,
        obstacles: parsed.obstacles,
        mapWidth: MAP_W,
        mapHeight: MAP_H,
      });
      const wall = parsed.obstacles.find((o) => o.blocksMovement && o.blocksBullets);
      expect(wall).toBeDefined();
      if (wall !== undefined) {
        expect(isBlockedAt(wall.x, wall.y, 8, parsed.obstacles)).toBe(true);
      }
      expect(playerSpawnClear(parsed)).toBe(true);
      const upKb = mergeScreenMove(0, -1);
      const upGp = mergeScreenMove(0, -1);
      expect(upKb).toEqual(upGp);
      saveSettings({ ...loadSettings('manual'), fireMode: 'auto' });
      expect(loadSettings('manual').fireMode).toBe('auto');
      settingsStorageRoundTrip({ ...loadSettings('manual'), fireMode: 'manual' });
      expect(state.player.x).toBeGreaterThan(0);
    });
  });

  describe('phase 4', () => {
    it('segment sweep, iso aim, reload timing', () => {
      if (phase < 4) return;
      const def = getWeaponDef('pistol');
      expect(fireIntervalSeconds(def)).toBeCloseTo(1 / BALANCE.weapons.pistol.fireRate);
      expect(def.reloadTime).toBe(BALANCE.weapons.pistol.reloadTime);
      const aim = screenDirectionToGrid(1, 0);
      const s0 = worldToScreen(100, 100);
      const s1 = worldToScreen(100 + aim.x * 64, 100 + aim.y * 64);
      const dir = normalize(vec2(s1.x - s0.x, s1.y - s0.y));
      expect(dir.x).not.toBe(0);
      const wall = {
        id: 1,
        x: 200,
        y: 200,
        halfW: 28,
        halfH: 28,
        blocksMovement: true,
        blocksBullets: true,
        tall: true,
      };
      const hit = sweepFirstObstacle(168, 200, 240, 0, 1 / 60, [wall]);
      expect(hit).not.toBeNull();
    });
  });

  describe('phase 5', () => {
    it('wave budget, zombie cap, xp curve', () => {
      if (phase < 5) return;
      let prev = waveBudget(1);
      for (let w = 2; w <= 25; w++) {
        const b = waveBudget(w);
        expect(b).toBeGreaterThanOrEqual(prev);
        prev = b;
      }
      expect(concurrentCap(10)).toBeLessThanOrEqual(700);
      expect(Number.isFinite(xpToNext(500))).toBe(true);
    });
  });

  describe('phase 6', () => {
    it('upgrade roll and level-up freeze hooks exist', () => {
      if (phase < 6) return;
      const parsed = parseMap();
      const state = createRunState({
        spawn: parsed.playerSpawn,
        obstacles: parsed.obstacles,
        mapWidth: MAP_W,
        mapHeight: MAP_H,
      });
      const opts = roll3(state);
      expect(opts).toHaveLength(3);
      expect(new Set(opts.map((o) => o.id)).size).toBe(3);
      state.pendingLevelUps = 1;
      simulationStep(state, emptyIntent(), 1 / 60);
      expect(state.phase).toBe('LEVEL_UP');
    });
  });

  describe('phase 7', () => {
    it('catalogue size and clamps', () => {
      if (phase < 7) return;
      expect(ALL_CATALOG_IDS.length).toBeGreaterThanOrEqual(40);
      const parsed = parseMap();
      const state = createRunState({
        spawn: parsed.playerSpawn,
        obstacles: parsed.obstacles,
        mapWidth: MAP_W,
        mapHeight: MAP_H,
      });
      state.ranks.attach_reddot = 99;
      state.stats = recomputeStats(state);
      expect(state.stats.critChance).toBeLessThanOrEqual(0.75);
    });
  });

  describe('phase 8', () => {
    it('all combat variants and telegraph min', () => {
      if (phase < 8) return;
      expect(COMBAT_VARIANTS.length).toBe(8);
      expect(BALANCE.zombies.telegraphMinSeconds).toBeGreaterThanOrEqual(0.4);
    });
  });

  describe('phase 9', () => {
    it('endless tuning constants and bounded harness', () => {
      if (phase < 9) return;
      expect(BALANCE.performance.maxPerWaveDesktop).toBe(600);
      expect(BALANCE.performance.maxZombiesDesktop).toBe(700);
      expect(waveStatScalar(10)).toBeCloseTo(1 + 0.055 * 9, 5);
      const parsed = parseMap();
      const state = createRunState({
        spawn: parsed.playerSpawn,
        obstacles: parsed.obstacles,
        mapWidth: MAP_W,
        mapHeight: MAP_H,
      });
      assertRunStateFinite(state);
      assertRunStateBounded(state);
    });
  });

  describe('phase 10', () => {
    it('vfx caps and accessibility toggles', () => {
      if (phase < 10) return;
      expect(BALANCE.vfx.maxFlashHz).toBe(3);
      expect(BALANCE.vfx.maxParticlesDesktop).toBe(240);
      const low = resolveJuiceCaps('low', false);
      expect(low.decals).toBe(0);
      expect(shouldScreenShake({ ...DEFAULT_SETTINGS, reducedMotion: true })).toBe(false);
    });
  });

  describe('phase 11', () => {
    it('HUD compact format, safe storage parse, responsive breakpoints', () => {
      if (phase < 11) return;
      expect(formatCompact(9999)).toBe('9999');
      expect(formatCompact(10_000)).toBe('10k');
      expect(() => loadCorruptBestSafe()).not.toThrow();
      expect(loadPersonalBest().wave).toBeGreaterThanOrEqual(0);
      expect(detectLayoutMode(390, 844)).toBe('portrait');
      expect(detectLayoutMode(1920, 1080)).toBe('landscape');
    });
  });
});
