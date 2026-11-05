import { describe, expect, it } from 'vitest';
import { parseMap } from '../src/game/map.ts';
import { createRunState } from '../src/game/state.ts';
import { assertRunStateBounded, assertRunStateFinite, simulationTick } from '../src/game/simHarness.ts';
import { emptyIntent } from '../src/input/intent.ts';
import { concurrentCap, waveBudget } from '../src/game/zombies/spawnDirector.ts';
import { vec2 } from '../src/core/math/vec2.ts';
import { initPlatformCaps } from '../src/config/platform.ts';

initPlatformCaps();

describe('sim headless', () => {
  it('60s auto-fire run respects caps and rising waves', () => {
    const parsed = parseMap();
    const state = createRunState({
      seed: 42,
      spawn: parsed.playerSpawn,
      obstacles: parsed.obstacles,
      mapWidth: 64,
      mapHeight: 64,
    });
    state.player.hp = 5000;
    state.player.maxHp = 5000;
    const intent = emptyIntent();
    intent.fire = true;
    intent.aim = vec2(1, 0);

    let lastWave = 1;
    let lastBudget = waveBudget(1);
    for (let i = 0; i < 60 * 60; i++) {
      intent.choose = state.phase === 'LEVEL_UP' ? 1 : null;
      simulationTick(state, intent, 1 / 60);
      expect(state.wave).toBeGreaterThanOrEqual(lastWave);
      const b = waveBudget(state.wave);
      expect(b).toBeGreaterThanOrEqual(lastBudget);
      lastWave = state.wave;
      lastBudget = b;
      const alive = state.zombies.filter((z) => z.active && z.state !== 'DYING').length;
      expect(alive).toBeLessThanOrEqual(concurrentCap(state.wave));
      for (const z of state.zombies) {
        if (!z.active || z.state !== 'SPAWNING') continue;
        expect(Math.hypot(z.x - state.player.x, z.y - state.player.y)).toBeGreaterThan(300);
      }
    }
    expect(state.wave).toBeGreaterThan(1);
  });

  it(
    '30-minute auto-fire run stays finite, capped, and scales past wave 60 / level 100',
    () => {
      const parsed = parseMap();
      const state = createRunState({
        seed: 9001,
        spawn: parsed.playerSpawn,
        obstacles: parsed.obstacles,
        mapWidth: 64,
        mapHeight: 64,
      });
      state.player.hp = 1_000_000;
      state.player.maxHp = 1_000_000;
      state.stats.damageTakenMult = 0;
      state.stats.xpGainMult = 8;
      const intent = emptyIntent();
      intent.fire = true;
      intent.aim = vec2(1, 0);

      const ticks = 30 * 60 * 60;
      let lastWave = 1;
      let lastLevel = 1;
      let totalMs = 0;

      for (let i = 0; i < ticks; i++) {
        state.stats.damageTakenMult = 0;
        state.stats.xpGainMult = 8;
        if (state.player.hp <= 0) state.player.hp = state.player.maxHp;
        if (state.phase === 'GAME_OVER') state.phase = 'PLAYING';
        intent.choose = state.phase === 'LEVEL_UP' ? 1 : null;

        const t0 = performance.now();
        simulationTick(state, intent, 1 / 60);
        totalMs += performance.now() - t0;

        expect(state.wave).toBeGreaterThanOrEqual(lastWave);
        expect(state.level).toBeGreaterThanOrEqual(lastLevel);
        lastWave = state.wave;
        lastLevel = state.level;

        if (i % 600 === 599) {
          assertRunStateFinite(state);
          assertRunStateBounded(state);
        }
      }

      assertRunStateFinite(state);
      assertRunStateBounded(state);
      simulationTick(state, intent, 1 / 60);
      expect(state.wave).toBeGreaterThan(60);
      expect(state.level).toBeGreaterThan(100);
      expect(totalMs / ticks).toBeLessThan(16);
    },
    1_800_000,
  );
});
